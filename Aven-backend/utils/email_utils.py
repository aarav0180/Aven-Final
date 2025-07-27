import smtplib
from email.mime.text import MIMEText
import os

def send_email_gmail(sender_email, app_password, recipient_email, subject, body):
    """
    Send an email using Gmail SMTP.
    Args:
        sender_email (str): Gmail address to send from.
        app_password (str): App password for Gmail SMTP.
        recipient_email (str): Recipient's email address.
        subject (str): Email subject.
        body (str): Email body (plain text).
    """
    msg = MIMEText(body)
    msg['Subject'] = subject
    msg['From'] = sender_email
    msg['To'] = recipient_email

    with smtplib.SMTP_SSL('smtp.gmail.com', 465) as server:
        server.login(sender_email, app_password)
        server.sendmail(sender_email, recipient_email, msg.as_string())

def send_email_sendgrid(api_key, sender_email, recipient_email, subject, body):
    """
    Send an email using SendGrid API.
    Args:
        api_key (str): SendGrid API key.
        sender_email (str): Verified sender email address.
        recipient_email (str): Recipient's email address.
        subject (str): Email subject.
        body (str): Email body (plain text).
    """
    try:
        import requests
        
        url = "https://api.sendgrid.com/v3/mail/send"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        
        data = {
            "personalizations": [
                {
                    "to": [{"email": recipient_email}]
                }
            ],
            "from": {"email": sender_email},
            "subject": subject,
            "content": [
                {
                    "type": "text/plain",
                    "value": body
                }
            ]
        }
        
        response = requests.post(url, headers=headers, json=data)
        response.raise_for_status()
        return True
    except Exception as e:
        print(f"SendGrid error: {e}")
        return False

def send_email_smtp_generic(smtp_server, smtp_port, username, password, sender_email, recipient_email, subject, body, use_ssl=True):
    """
    Send email using any SMTP server (Outlook, Yahoo, etc.).
    Args:
        smtp_server (str): SMTP server (e.g., 'smtp-mail.outlook.com').
        smtp_port (int): SMTP port (587 for TLS, 465 for SSL).
        username (str): Email username.
        password (str): Email password or app password.
        sender_email (str): Sender email address.
        recipient_email (str): Recipient email address.
        subject (str): Email subject.
        body (str): Email body.
        use_ssl (bool): Use SSL connection.
    """
    msg = MIMEText(body)
    msg['Subject'] = subject
    msg['From'] = sender_email
    msg['To'] = recipient_email

    if use_ssl:
        with smtplib.SMTP_SSL(smtp_server, smtp_port) as server:
            server.login(username, password)
            server.sendmail(sender_email, recipient_email, msg.as_string())
    else:
        with smtplib.SMTP(smtp_server, smtp_port) as server:
            server.starttls()
            server.login(username, password)
            server.sendmail(sender_email, recipient_email, msg.as_string()) 