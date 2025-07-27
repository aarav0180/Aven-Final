
import re

SENSITIVE_PATTERNS = [
    r"\b\d{3}[-.\s]?\d{2}[-.\s]?\d{4}\b",  # SSN
    r"\b\d{16}\b",  # Credit card
    r"\b\d{10}\b",  # Phone number
    # r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+",  # Email - REMOVED to allow email sharing
    r"\b\d{5}(?:-\d{4})?\b",  # US ZIP
    r"\b(?:\d[ -]*?){13,16}\b",  # Credit card (loose)
    r"\b(?:\d[ -]*?){9,12}\b",  # Bank account (loose)
]

ABUSIVE_WORDS = [
    "abuse", "hate", "kill", "suicide", "violence", "racist", "sexist", "terrorist", "attack",
    "idiot", "stupid", "dumb", "fool", "moron", "bastard", "bitch", "asshole", "slut", "whore"
]

def check_guardrails(user_query: str):
    # Check for sensitive info
    for pattern in SENSITIVE_PATTERNS:
        if re.search(pattern, user_query, re.IGNORECASE):
            return "Your message appears to contain sensitive or personal information. Please remove it and try again."
    # Check for abusive language
    for word in ABUSIVE_WORDS:
        if word in user_query.lower():
            return "Your message contains language that is not allowed. Please rephrase."
    # Check for requests for legal/financial/medical advice
    if re.search(r"\b(legal|lawyer|attorney|finance|investment|medical|doctor|diagnosis|prescribe|prescription)\b", user_query, re.IGNORECASE):
        return "Sorry, I cannot provide legal, financial, or medical advice."
    return None

def try_tool_call(user_query: str, message_history: str = None):
    """
    Detects if the user wants to send an email, schedule a meeting, or set a reminder.
    Returns a dict with options if a tool call is detected, else None.
    Now offers richer options and customer service connection.
    """
    lowered = user_query.lower()
    # Email or Meeting intent - expanded trigger words
    if any(word in lowered for word in [
        "send email", "email", "mail", "compose email", "schedule meeting", "book meeting", 
        "set up meeting", "meeting with", "contact", "tell", "inform", "notify", "reach out", 
        "get in touch", "let them know", "report", "escalate", "contact team", "tell team",
        "inform team", "notify team", "reach out to team", "get in touch with team"
    ]):
        options = [
            {
                "option": "Schedule a meeting",
                "actions": [
                    "Schedule via Google Calendar",
                    "Send an email with the recorded message history"
                ]
            },
            {
                "option": "Just inform the team",
                "actions": [
                    "Send an email with the recorded message history"
                ]
            },
            {
                "option": "Connect with customer service",
                "actions": [
                    "Connect you with a customer service representative"
                ]
            }
        ]
        return {
            "tool": "meeting_or_email",
            "message": "Would you like to schedule a meeting, just inform the team, or connect with customer service?",
            "options": options,
            "fields": ["participants (if meeting)", "recipient (if email)", "subject", "message", "date", "time"],
            "message_history": message_history
        }
    # Reminder intent
    if any(word in lowered for word in ["remind me", "set reminder", "reminder for", "remind about"]):
        options = [
            {
                "option": "Set a reminder",
                "actions": [
                    "Create a reminder for you"]
            },
            {
                "option": "Connect with customer service",
                "actions": [
                    "Connect you with a customer service representative"]
            }
        ]
        return {
            "tool": "reminder",
            "message": "Would you like to set a reminder or connect with customer service?",
            "options": options,
            "fields": ["reminder_text", "date", "time"],
            "message_history": message_history
        }
    return None