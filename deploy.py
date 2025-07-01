#!/usr/bin/env python3

"""
Python-based deployment script for Supabase functions
This script attempts to deploy the function using subprocess calls
"""

import subprocess
import os
import sys
import time
import urllib.request
import urllib.error

PROJECT_ID = "zsmoutzjhqjgjehaituw"
FUNCTION_NAME = "install-direct"
PROJECT_DIR = os.getcwd()

def log(message):
    print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] {message}")

def test_function():
    """Test if the function is deployed and working"""
    test_url = f"https://{PROJECT_ID}.supabase.co/functions/v1/{FUNCTION_NAME}?shop=testingstoresumeet.myshopify.com"
    
    log(f"🧪 Testing function at: {test_url}")
    
    try:
        req = urllib.request.Request(test_url)
        req.add_header('User-Agent', 'Mozilla/5.0 (compatible; SmartPop-Test/1.0)')
        
        with urllib.request.urlopen(req, timeout=10) as response:
            content = response.read().decode('utf-8')
            status = response.status
            
            log(f"📊 Response status: {status}")
            
            if status == 200 and any(keyword in content for keyword in ['SmartPop', 'Installing', 'OAuth']):
                log("✅ Function is working correctly!")
                return True
            else:
                log("⚠️  Function responded but content may be unexpected")
                return False
                
    except urllib.error.HTTPError as e:
        log(f"❌ HTTP Error: {e.code} - {e.reason}")
        return False
    except Exception as e:
        log(f"❌ Request failed: {str(e)}")
        return False

def run_command(command, description):
    """Run a shell command and return success status"""
    log(f"🔄 {description}")
    log(f"   Command: {' '.join(command)}")
    
    try:
        result = subprocess.run(
            command,
            cwd=PROJECT_DIR,
            capture_output=True,
            text=True,
            timeout=120  # 2 minute timeout
        )
        
        if result.stdout:
            log(f"📤 Output: {result.stdout.strip()}")
        
        if result.stderr and 'warning' not in result.stderr.lower():
            log(f"⚠️  Stderr: {result.stderr.strip()}")
        
        if result.returncode == 0:
            log("✅ Command completed successfully")
            return True
        else:
            log(f"❌ Command failed with code: {result.returncode}")
            return False
            
    except subprocess.TimeoutExpired:
        log("❌ Command timed out")
        return False
    except Exception as e:
        log(f"❌ Command failed: {str(e)}")
        return False

def check_files():
    """Check if required files exist"""
    function_path = os.path.join(PROJECT_DIR, "supabase", "functions", FUNCTION_NAME, "index.ts")
    config_path = os.path.join(PROJECT_DIR, "supabase", "config.toml")
    
    log("📋 Checking required files...")
    
    if os.path.exists(function_path):
        log("✅ Function file exists")
    else:
        log(f"❌ Function file missing: {function_path}")
        return False
    
    if os.path.exists(config_path):
        log("✅ Config file exists")
    else:
        log(f"❌ Config file missing: {config_path}")
        return False
    
    return True

def main():
    log("🚀 Python Deployment Script Starting...")
    log(f"📍 Project Directory: {PROJECT_DIR}")
    log(f"📍 Project ID: {PROJECT_ID}")
    log(f"📍 Function Name: {FUNCTION_NAME}")
    
    # Check if function is already deployed
    if test_function():
        log("🎉 Function is already deployed and working!")
        log(f"🔗 Function URL: https://{PROJECT_ID}.supabase.co/functions/v1/{FUNCTION_NAME}")
        return
    
    # Check files
    if not check_files():
        log("❌ Required files missing. Cannot proceed.")
        sys.exit(1)
    
    # Try deployment commands
    deployment_commands = [
        {
            'command': ['npx', 'supabase', 'functions', 'deploy', FUNCTION_NAME, '--project-ref', PROJECT_ID, '--no-verify-jwt'],
            'description': 'Deploying with npx supabase (with project ref)'
        },
        {
            'command': ['npx', 'supabase', 'functions', 'deploy', FUNCTION_NAME, '--no-verify-jwt'],
            'description': 'Deploying with npx supabase (without project ref)'
        },
        {
            'command': ['yarn', 'dlx', 'supabase', 'functions', 'deploy', FUNCTION_NAME, '--project-ref', PROJECT_ID, '--no-verify-jwt'],
            'description': 'Deploying with yarn dlx supabase'
        },
        {
            'command': ['bunx', 'supabase', 'functions', 'deploy', FUNCTION_NAME, '--project-ref', PROJECT_ID, '--no-verify-jwt'],
            'description': 'Deploying with bunx supabase'
        }
    ]
    
    deployed = False
    
    for cmd_info in deployment_commands:
        if run_command(cmd_info['command'], cmd_info['description']):
            deployed = True
            break
        
        # Wait between attempts
        time.sleep(2)
    
    if deployed:
        log("🎉 Deployment command executed successfully!")
        
        # Wait for propagation
        log("⏳ Waiting for deployment to propagate...")
        time.sleep(5)
        
        # Test the deployment
        if test_function():
            log("✅ DEPLOYMENT SUCCESSFUL AND VERIFIED!")
            log("🔗 Function URLs:")
            log(f"   Main: https://{PROJECT_ID}.supabase.co/functions/v1/{FUNCTION_NAME}")
            log(f"   Test: https://{PROJECT_ID}.supabase.co/functions/v1/{FUNCTION_NAME}?shop=testingstoresumeet.myshopify.com")
        else:
            log("⚠️  Deployment completed but verification failed")
            log("Function may still be starting up. Try testing again in a few minutes.")
    else:
        log("❌ All deployment commands failed")
        log("")
        log("🔧 Manual deployment required:")
        log("1. npm install -g supabase")
        log("2. supabase login")
        log(f"3. supabase functions deploy {FUNCTION_NAME} --project-ref {PROJECT_ID} --no-verify-jwt")

if __name__ == "__main__":
    main()