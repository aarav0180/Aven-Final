# app.py
from flask import Flask, request, jsonify, make_response
from embeddings import get_query_embedding
from retrieval import retrieve_context
from prompting import build_aven_prompt
from llm import call_llm
from guardrails import check_guardrails, try_tool_call
import os
import re
from pymongo import MongoClient
import logging
from utils.email_utils import send_email_gmail, send_email_sendgrid
from utils.meeting_utils import generate_jitsi_meet_link
from utils.cache_utils import ResponseCache

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Initialize response cache
response_cache = ResponseCache(ttl_hours=24)  # Cache for 24 hours

# Log email configuration on startup
logger.info("=== Email Configuration ===")
logger.info(f"SENDER_EMAIL: {os.getenv('SENDER_EMAIL', 'NOT SET')}")
logger.info(f"AVEN_SUPPORT_EMAIL: {os.getenv('AVEN_SUPPORT_EMAIL', 'NOT SET')}")
logger.info(f"SENDGRID_API_KEY: {'SET' if os.getenv('SENDGRID_API_KEY') else 'NOT SET'}")
app_password = os.getenv('EMAIL_APP_PASSWORD', 'NOT SET')
if app_password != 'NOT SET':
    masked_password = f"{app_password[:2]}***{app_password[-2:]}" if len(app_password) > 4 else "***"
    logger.info(f"EMAIL_APP_PASSWORD: {masked_password} (length: {len(app_password)})")
else:
    logger.info("EMAIL_APP_PASSWORD: NOT SET")
logger.info("==========================")

# Log cache stats on startup
cache_stats = response_cache.get_stats()
logger.info(f"=== Cache Stats ===")
logger.info(f"Active entries: {cache_stats['active_entries']}")
logger.info(f"Total entries: {cache_stats['total_entries']}")
logger.info(f"Cache size: {cache_stats['cache_size_mb']:.2f} MB")
logger.info("===================")

# Add CORS headers to all responses
def add_cors_headers(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Credentials'] = 'true'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, X-User-Role, Authorization, Accept, Origin'
    response.headers['Access-Control-Max-Age'] = '3600'
    return response

app.after_request(add_cors_headers)

# ---
# extract_root_domain: Given a full domain (e.g., ai.dashimobile.com), returns the root domain (e.g., dashimobile.com).
# This is used to map subdomains to a canonical user or organization for custom context retrieval.
def extract_root_domain(domain):
    if not domain:
        return None
    parts = domain.split('.')
    if len(parts) < 2:
        return domain
    tlds = {'co.uk', 'com.au', 'org.uk', 'gov.uk', 'ac.uk'}
    last_two = '.'.join(parts[-2:])
    last_three = '.'.join(parts[-3:])
    if last_two in tlds and len(parts) >= 3:
        return '.'.join(parts[-3:])
    return '.'.join(parts[-2:])

def get_username_for_domain(domain):
    try:
        mongodb_url = os.getenv('MONGODB_URI')
        db_name = 'test'
        if not mongodb_url:
            return None
        client = MongoClient(mongodb_url)
        db = client.get_database(db_name)
        if 'domains' not in db.list_collection_names():
            return None
        domains_collection = db['domains']
        root_domain = extract_root_domain(domain)
        if not root_domain:
            return None
        entry = domains_collection.find_one({'domain': root_domain})
        if entry and 'username' in entry:
            return entry['username']
        entry = domains_collection.find_one({'domain': {'$regex': f'{root_domain}$', '$options': 'i'}})
        if entry and 'username' in entry:
            return entry['username']
        entry = domains_collection.find_one({'domain': f'www.{root_domain}'})
        if entry and 'username' in entry:
            return entry['username']
        if root_domain in ['zelio-4yp3.onrender.com', 'www.zelio-4yp3.onrender.com']:
            entry = domains_collection.find_one({'domain': root_domain})
            if entry and 'username' in entry:
                return entry['username']
    except Exception:
        pass
    return None

@app.route("/api/chat", methods=["GET", "POST", "OPTIONS"])
def chat():
    logger.info(f"Received {request.method} request at /api/chat")
    if request.method == 'OPTIONS':
        logger.info("OPTIONS request handled.")
        return make_response('', 200)
    if request.method == 'POST':
        try:
            data = request.json or {}
            logger.info(f"Request data: {data}")
            user_query = data.get('query', '')
            chat_history = data.get('chatHistory', [])
            user_id = data.get('userId')
            # --- Detect user email from /mail or in text ---
            user_email = None
            # Check for /mail command in user_query
            mail_match = re.search(r"/mail\s*([\w\.-]+@[\w\.-]+)", user_query)
            if mail_match:
                user_email = mail_match.group(1)
            # If not found, check in chat history (only user messages)
            if not user_email:
                for msg in chat_history:
                    if isinstance(msg, dict) and 'content' in msg and msg.get('role') == 'user':
                        mail_match = re.search(r"/mail\s*([\w\.-]+@[\w\.-]+)", msg['content'])
                        if mail_match:
                            user_email = mail_match.group(1)
                            break
            # Also check for plain email in user_query
            if not user_email:
                mail_match = re.search(r"[\w\.-]+@[\w\.-]+", user_query)
                if mail_match:
                    user_email = mail_match.group(0)
            # Or in chat history (only user messages)
            if not user_email:
                for msg in chat_history:
                    if isinstance(msg, dict) and 'content' in msg and msg.get('role') == 'user':
                        mail_match = re.search(r"[\w\.-]+@[\w\.-]+", msg['content'])
                        if mail_match:
                            potential_email = mail_match.group(0)
                            # Filter out support/noreply emails
                            if not any(exclude in potential_email.lower() for exclude in ['support@', 'noreply@', 'no-reply@', 'admin@', 'info@']):
                                user_email = potential_email
                                break
            # Log detected email
            if user_email:
                logger.info(f"Detected user email: {user_email}")
            # ---
            if not isinstance(chat_history, list):
                logger.warning("chatHistory is not a list. Resetting to empty list.")
                chat_history = []
            if len(chat_history) > 10:
                logger.info("Trimming chatHistory to last 10 messages.")
                chat_history = chat_history[-10:]
            validated_history = []
            for msg in chat_history:
                if isinstance(msg, dict) and 'role' in msg and 'content' in msg:
                    role = msg['role'].lower()
                    # Accept 'ai' as a valid role, map to 'assistant'
                    if role == 'ai':
                        role = 'assistant'
                    if role in ['user', 'assistant']:
                        validated_history.append({
                            'role': role,
                            'content': str(msg['content']),
                            'timestamp': msg.get('timestamp', '')
                        })
            chat_history = validated_history
            referer = request.headers.get('Origin') or request.headers.get('Referer')
            domain = None
            if referer:
                from urllib.parse import urlparse
                parsed = urlparse(referer)
                domain = parsed.hostname
            username_for_domain = None
            pinecone_filter = {}
            search_mode = 'global'
            subject = None
            if domain:
                username_for_domain = get_username_for_domain(domain)
                if username_for_domain:
                    search_mode = 'custom'
                    subject = username_for_domain
                    pinecone_filter = {"subject": username_for_domain}
                else:
                    search_mode = 'global'
                    subject = None
                    pinecone_filter = {}
            else:
                username_for_domain = request.cookies.get('username') or data.get('username')
                if username_for_domain:
                    search_mode = 'custom'
                    subject = username_for_domain
                    pinecone_filter = {"subject": username_for_domain}
                else:
                    search_mode = 'global'
                    subject = None
                    pinecone_filter = {}
            guardrail_response = check_guardrails(user_query)
            if guardrail_response:
                logger.info(f"Guardrail triggered: {guardrail_response}")
                return jsonify({"response": guardrail_response})
            
            embedding = get_query_embedding(user_query)
            context, instructional_prompt = retrieve_context(user_query, embedding, pinecone_filter)
            messages = build_aven_prompt(user_query, context, chat_history, instructional_prompt)
            
            # Check cache for the response
            cached_response = response_cache.get(user_query)
            if cached_response:
                logger.info(f"Response found in cache for query: {user_query}")
                return jsonify({"response": cached_response})
            
            answer = call_llm(messages)
            
            # Store response in cache
            response_cache.set(user_query, answer)
            logger.info(f"Response cached for query: {user_query}")
            
            # Check if AI response suggests scheduling or contacting support
            ai_suggests_action = False
            action_keywords = [
                'schedule', 'meeting', 'call', 'contact support', 'email support', 
                'reach out', 'get in touch', 'contact us', 'support team'
            ]
            
            for keyword in action_keywords:
                if keyword in answer.lower():
                    ai_suggests_action = True
                    break
            
            # Check for RAG/canned phrases that imply team follow-up
            rag_followup_phrases = [
                "i've informed the team", "you can expect to hear from them", "a member of our team will call you",
                "we have received your request", "the team will contact you", "we will follow up", "you will be contacted",
                "we will get back to you", "thank you for your inquiry", "your reference number is", "we will reach out"
            ]
            rag_suggests_followup = False
            for phrase in rag_followup_phrases:
                if phrase in answer.lower():
                    rag_suggests_followup = True
                    break
            
            # Check if user is responding to AI's action suggestion
            user_agrees_to_action = False
            agreement_keywords = [
                'yes', 'okay', 'sure', 'please do', 'schedule', 'contact', 'meeting',
                'go ahead', 'that would be great', 'please', 'do it'
            ]
            
            for keyword in agreement_keywords:
                if keyword in user_query.lower():
                    user_agrees_to_action = True
                    break
            
            # If user agrees to action and has email, proceed
            if user_agrees_to_action and user_email and (ai_suggests_action or rag_suggests_followup):
                try:
                    support_email = os.getenv('AVEN_SUPPORT_EMAIL', "iit2023092@iiita.ac.in")
                    sender_email = os.getenv('SENDER_EMAIL', "aarav.18o2005@gmail.com")
                    app_password = os.getenv('EMAIL_APP_PASSWORD', "Aven")
                    
                    # Log email and password for debugging (mask password for security)
                    logger.info(f"Trying to send email with SENDER_EMAIL={sender_email}")
                    if app_password:
                        masked_password = f"{app_password[:2]}***{app_password[-2:]}" if len(app_password) > 4 else "***"
                        logger.info(f"APP_PASSWORD={masked_password} (length: {len(app_password)})")
                    else:
                        logger.info("APP_PASSWORD is None or empty")
                    
                    message_history = '\n'.join([f"{msg['role']}: {msg['content']}" for msg in chat_history])
                    
                    # Determine action type based on AI response
                    if ai_suggests_action and any(word in answer.lower() for word in ['schedule', 'meeting', 'call']):
                        # Schedule meeting
                        meet_link = generate_jitsi_meet_link()
                        team_body = f"Meeting scheduled by user.\nUser email: {user_email}\nJoin here: {meet_link}\n\nMessage history:\n{message_history}"
                        
                        # Try SendGrid first, fallback to Gmail
                        sendgrid_api_key = os.getenv('SENDGRID_API_KEY')
                        if sendgrid_api_key:
                            try:
                                send_email_sendgrid(sendgrid_api_key, sender_email, support_email, "Meeting Request", team_body)
                                send_email_sendgrid(sendgrid_api_key, sender_email, user_email, "Meeting Scheduled", f"Your meeting request has been received. Our team will contact you soon. Meeting link: {meet_link}")
                                return jsonify({"response": f"Meeting scheduled! Link: {meet_link} (info sent to you and support team)"})
                            except Exception as e:
                                logger.error(f"SendGrid failed, trying Gmail: {e}")
                        
                        # Fallback to Gmail
                        send_email_gmail(sender_email, app_password, support_email, "Meeting Request", team_body)
                        send_email_gmail(sender_email, app_password, user_email, "Meeting Scheduled", f"Your meeting request has been received. Our team will contact you soon. Meeting link: {meet_link}")
                        return jsonify({"response": f"Meeting scheduled! Link: {meet_link} (info sent to you and support team)"})
                    else:
                        # Just inform team
                        team_body = f"User requested support.\nUser email: {user_email}\n\nMessage history:\n{message_history}"
                        
                        # Try SendGrid first, fallback to Gmail
                        sendgrid_api_key = os.getenv('SENDGRID_API_KEY')
                        if sendgrid_api_key:
                            try:
                                send_email_sendgrid(sendgrid_api_key, sender_email, support_email, "Support Request", team_body)
                                send_email_sendgrid(sendgrid_api_key, sender_email, user_email, "Support Request Received", "Your request has been received. Our team will contact you soon.")
                                return jsonify({"response": "Team has been informed via email. You will be contacted soon."})
                            except Exception as e:
                                logger.error(f"SendGrid failed, trying Gmail: {e}")
                        
                        # Fallback to Gmail
                        send_email_gmail(sender_email, app_password, support_email, "Support Request", team_body)
                        send_email_gmail(sender_email, app_password, user_email, "Support Request Received", "Your request has been received. Our team will contact you soon.")
                        return jsonify({"response": "Team has been informed via email. You will be contacted soon."})
                except Exception as e:
                    logger.error(f"Email sending failed: {e}")
                    if "Application-specific password required" in str(e):
                        return jsonify({"response": "I'm having trouble sending emails right now due to a configuration issue. Please contact support@aven.com directly or use the in-app chat feature."})
                    else:
                        return jsonify({"response": "I'm having trouble sending emails right now. Please contact support@aven.com directly or use the in-app chat feature."})
            
            # If AI suggests action and user provided email, offer to help
            elif (ai_suggests_action or rag_suggests_followup) and user_email:
                answer += f"\n\nI can help you with that! I have your email ({user_email}). Would you like me to schedule a meeting or contact the support team on your behalf?"
            elif (ai_suggests_action or rag_suggests_followup) and not user_email:
                answer += "\n\nTo make sure the team can reach you, please provide your email address."
            
            logger.info(f"Response sent: {answer}")
            return jsonify({"response": answer})
        except Exception as e:
            logger.error(f"Error processing chat request: {e}", exc_info=True)
            return jsonify({
                'error': 'Failed to process chat request',
                'details': str(e)
            }), 500

@app.route("/api/cache/stats", methods=["GET"])
def cache_stats():
    """Get cache statistics."""
    stats = response_cache.get_stats()
    return jsonify(stats)

@app.route("/api/cache/clear", methods=["POST"])
def clear_cache():
    """Clear all cache entries."""
    response_cache.cache.clear()
    response_cache.save_cache()
    logger.info("Cache cleared")
    return jsonify({"message": "Cache cleared successfully"})

@app.route("/api/cache/clear-expired", methods=["POST"])
def clear_expired_cache():
    """Clear expired cache entries."""
    before_count = len(response_cache.cache)
    response_cache.clear_expired()
    after_count = len(response_cache.cache)
    cleared_count = before_count - after_count
    logger.info(f"Cleared {cleared_count} expired cache entries")
    return jsonify({
        "message": f"Cleared {cleared_count} expired entries",
        "remaining_entries": after_count
    })

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)