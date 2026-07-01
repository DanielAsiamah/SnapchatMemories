import os
import json
import requests
from dotenv import load_dotenv
import firebase_admin
from firebase_admin import credentials, auth, firestore

# Load environment variables
load_dotenv()

# Initialize Firebase Admin SDK
FIREBASE_SERVICE_ACCOUNT_KEY_PATH = os.getenv("FIREBASE_SERVICE_ACCOUNT_KEY_PATH", "./serviceAccountKey.json")
FIREBASE_PROJECT_ID = os.getenv("FIREBASE_PROJECT_ID", "snapvault-2cfe0")

firebase_initialized = False
db = None

def initialize_firebase():
    global firebase_initialized, db
    if firebase_initialized:
        return True
    
    try:
        if not os.path.exists(FIREBASE_SERVICE_ACCOUNT_KEY_PATH):
            print(f"Firebase service account key not found at {FIREBASE_SERVICE_ACCOUNT_KEY_PATH}")
            return False
        
        cred = credentials.Certificate(FIREBASE_SERVICE_ACCOUNT_KEY_PATH)
        firebase_admin.initialize_app(cred)
        db = firestore.client()
        firebase_initialized = True
        print("Firebase initialized successfully!")
        return True
    except Exception as e:
        print(f"Failed to initialize Firebase: {e}")
        return False

def sign_in_with_email_password(email: str, password: str):
    """Sign in user with email and password using Firebase Auth REST API"""
    if not initialize_firebase():
        return None, "Failed to initialize Firebase"
    
    # Use Firebase Auth REST API to sign in
    api_key = None
    try:
        # Try to get API key from service account file
        with open(FIREBASE_SERVICE_ACCOUNT_KEY_PATH, "r") as f:
            sa = json.load(f)
            # Note: Service account doesn't have API key, we need another way
            # For now, we'll use Firebase Auth REST API with API key (user needs to add to .env)
            api_key = os.getenv("FIREBASE_API_KEY")
            if not api_key:
                return None, "FIREBASE_API_KEY not set in .env file"
    except Exception as e:
        return None, f"Failed to load service account: {e}"
    
    url = f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={api_key}"
    payload = {
        "email": email,
        "password": password,
        "returnSecureToken": True
    }
    
    try:
        response = requests.post(url, json=payload)
        response.raise_for_status()
        data = response.json()
        user_id = data["localId"]
        id_token = data["idToken"]
        return {"user_id": user_id, "id_token": id_token}, None
    except requests.exceptions.HTTPError as e:
        error_data = e.response.json() if e.response else {}
        error_msg = error_data.get("error", {}).get("message", str(e))
        return None, error_msg
    except Exception as e:
        return None, str(e)

def create_user_with_email_password(email: str, password: str):
    """Create a new user with email and password"""
    if not initialize_firebase():
        return None, "Failed to initialize Firebase"
    
    try:
        user = auth.create_user(email=email, password=password)
        # Create user document in Firestore
        db.collection("users").document(user.uid).set({
            "email": email,
            "isPremium": False,
            "createdAt": firestore.SERVER_TIMESTAMP,
            "updatedAt": firestore.SERVER_TIMESTAMP
        })
        return {"user_id": user.uid}, None
    except Exception as e:
        return None, str(e)

def get_user_premium_status(user_id: str):
    """Check if user is premium"""
    if not initialize_firebase():
        return False
    
    try:
        user_doc = db.collection("users").document(user_id).get()
        if user_doc.exists:
            return user_doc.to_dict().get("isPremium", False)
        return False
    except Exception as e:
        print(f"Error checking premium status: {e}")
        return False

def listen_for_premium_upgrade(user_id: str, callback):
    """Listen for premium status changes in Firestore"""
    if not initialize_firebase():
        return
    
    def on_snapshot(doc_snapshot, changes, read_time):
        for doc in doc_snapshot:
            if doc.exists:
                is_premium = doc.to_dict().get("isPremium", False)
                callback(is_premium)
    
    doc_ref = db.collection("users").document(user_id)
    doc_ref.on_snapshot(on_snapshot)

def log_export(user_id: str, memories_count: int):
    """Log export event to Firestore"""
    if not initialize_firebase():
        return
    
    try:
        db.collection("users").document(user_id).collection("exports").add({
            "memoriesCount": memories_count,
            "timestamp": firestore.SERVER_TIMESTAMP
        })
    except Exception as e:
        print(f"Error logging export: {e}")
