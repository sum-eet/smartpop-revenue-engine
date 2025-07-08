#!/usr/bin/env python3
"""
PROGRAMMATIC DEPLOYMENT FIX
This script will fix the 2 popup issue by cleaning up script tags programmatically.
"""

import requests
import json
import time
import os
import subprocess

def get_shopify_access_token():
    """Get access token from user or environment"""
    token = os.getenv('SHOPIFY_ACCESS_TOKEN')
    if not token or token == 'YOUR_ACCESS_TOKEN_HERE':
        print("🔑 Need Shopify Admin API access token")
        print("1. Go to: https://testingstoresumeet.myshopify.com/admin/settings/apps")
        print("2. Create a private app or get existing token")
        print("3. Copy the access token")
        token = input("Enter your Shopify access token: ").strip()
    return token

def fix_deployment():
    """Main function to fix deployment issues"""
    print("🚨 PROGRAMMATIC DEPLOYMENT FIX STARTING...")
    
    shop_domain = "testingstoresumeet.myshopify.com"
    access_token = get_shopify_access_token()
    
    if not access_token:
        print("❌ No access token provided. Cannot continue.")
        return False
    
    headers = {
        'X-Shopify-Access-Token': access_token,
        'Content-Type': 'application/json'
    }
    
    base_url = f"https://{shop_domain}/admin/api/2023-10"
    
    try:
        # Step 1: Get all script tags
        print("📋 Step 1: Fetching current script tags...")
        response = requests.get(f"{base_url}/script_tags.json", headers=headers)
        
        if response.status_code != 200:
            print(f"❌ Failed to fetch script tags: {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        data = response.json()
        script_tags = data.get('script_tags', [])
        
        print(f"Found {len(script_tags)} total script tags")
        
        # Step 2: Identify popup-related scripts
        popup_scripts = []
        for script in script_tags:
            src = script.get('src', '')
            if any(keyword in src.lower() for keyword in ['popup', 'smartpop', 'supabase.co/functions']):
                popup_scripts.append(script)
                print(f"  - Found popup script: {src}")
        
        print(f"🗑️ Step 2: Found {len(popup_scripts)} popup scripts to remove")
        
        # Step 3: Delete popup scripts
        for script in popup_scripts:
            script_id = script['id']
            print(f"Deleting script ID: {script_id}")
            
            delete_response = requests.delete(
                f"{base_url}/script_tags/{script_id}.json",
                headers=headers
            )
            
            if delete_response.status_code in [200, 204]:
                print(f"✅ Deleted script ID: {script_id}")
            else:
                print(f"❌ Failed to delete script ID: {script_id} - {delete_response.status_code}")
        
        # Step 4: Install ONE clean script
        print("🧹 Step 3: Installing ONE clean script...")
        
        new_script_url = f"https://zsmoutzjhqjgjehaituw.supabase.co/functions/v1/popup-embed-public?shop={shop_domain}&fix=programmatic&v={int(time.time())}"
        
        new_script_data = {
            "script_tag": {
                "event": "onload",
                "src": new_script_url
            }
        }
        
        install_response = requests.post(
            f"{base_url}/script_tags.json",
            headers=headers,
            json=new_script_data
        )
        
        if install_response.status_code == 201:
            result = install_response.json()
            script_tag = result.get('script_tag', {})
            
            print("\n🎉🎉🎉 DEPLOYMENT FIXED PROGRAMMATICALLY! 🎉🎉🎉")
            print(f"✅ New Script ID: {script_tag.get('id')}")
            print(f"✅ Script URL: {script_tag.get('src')}")
            print("\n📋 NEXT STEPS:")
            print("1. Clear browser cache completely")
            print("2. Visit your store with hard refresh (Ctrl+Shift+R)")
            print("3. Should see ONLY ONE popup")
            print("4. Email validation should reject 'a', 'eee@g', etc.")
            
            return True
        else:
            print(f"❌ Failed to install new script: {install_response.status_code}")
            print(f"Response: {install_response.text}")
            return False
    
    except Exception as e:
        print(f"❌ Error during deployment fix: {e}")
        return False

def deploy_supabase_functions():
    """Deploy latest Supabase functions"""
    print("🚀 Deploying latest Supabase functions...")
    
    try:
        os.chdir('supabase')
        result = subprocess.run([
            'npx', 'supabase', 'functions', 'deploy', 'popup-embed-public', '--no-verify-jwt'
        ], capture_output=True, text=True)
        
        if result.returncode == 0:
            print("✅ Supabase function deployed successfully")
            return True
        else:
            print(f"❌ Supabase deployment failed: {result.stderr}")
            return False
    except Exception as e:
        print(f"❌ Error deploying Supabase functions: {e}")
        return False
    finally:
        os.chdir('..')

def main():
    """Main execution"""
    print("🔧 COMPREHENSIVE PROGRAMMATIC FIX")
    print("This will solve the 2 popup issue once and for all.")
    print()
    
    # Step 1: Deploy latest Supabase functions
    if not deploy_supabase_functions():
        print("⚠️ Supabase deployment failed, but continuing with Shopify fix...")
    
    # Step 2: Fix Shopify deployment
    if fix_deployment():
        print("\n✅ DEPLOYMENT FIX COMPLETE!")
        print("The 2 popup issue should now be resolved.")
    else:
        print("\n❌ DEPLOYMENT FIX FAILED!")
        print("Manual intervention may be required.")

if __name__ == "__main__":
    main()