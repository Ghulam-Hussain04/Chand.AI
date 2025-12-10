"""
Test script for image upload and retrieval endpoints
Run this script to test all image management endpoints
"""

import requests
import os
from pathlib import Path

BASE_URL = "http://localhost:8000/files"

# Test helper function
def print_test(title):
    print(f"\n{'='*60}")
    print(f"TEST: {title}")
    print('='*60)

# Test data
test_image_path = "test_image.jpg"  # Replace with actual test image path

def test_1_upload_image():
    """Test uploading an image to a mission folder"""
    print_test("Upload Image to Mission")
    
    # Create a simple test image if it doesn't exist
    if not os.path.exists(test_image_path):
        # Create a minimal JPEG for testing
        from PIL import Image
        img = Image.new('RGB', (100, 100), color='red')
        img.save(test_image_path)
        print(f"Created test image: {test_image_path}")
    
    with open(test_image_path, "rb") as f:
        files = {"file": (test_image_path, f, "image/jpeg")}
        params = {"mission_name": "mission_alpha"}
        
        response = requests.post(f"{BASE_URL}/images/upload", files=files, params=params)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")
        
        if response.status_code == 200:
            print("✓ Upload successful")
        else:
            print("✗ Upload failed")
        
        return response.json()


def test_2_upload_multiple():
    """Test uploading multiple images"""
    print_test("Upload Multiple Images")
    
    missions = ["mission_alpha", "mission_beta", "mission_gamma"]
    
    for mission in missions:
        with open(test_image_path, "rb") as f:
            files = {"file": (f"{mission}_image.jpg", f, "image/jpeg")}
            params = {"mission_name": mission}
            
            response = requests.post(f"{BASE_URL}/images/upload", files=files, params=params)
            status = "✓" if response.status_code == 200 else "✗"
            print(f"{status} {mission}: {response.status_code}")


def test_3_get_root_directory():
    """Test retrieving root images directory"""
    print_test("Get Root Images Directory")
    
    response = requests.get(f"{BASE_URL}/images")
    print(f"Status Code: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"Current Path: {data.get('current_path')}")
        print(f"Items found: {len(data.get('items', []))}")
        
        print("\nDirectory Structure:")
        for item in data.get('items', []):
            item_type = "📁" if item['type'] == 'folder' else "🖼️"
            print(f"  {item_type} {item['name']} ({item['type']})")
        
        print("✓ Root directory retrieval successful")
    else:
        print("✗ Failed to retrieve root directory")


def test_4_get_mission_contents():
    """Test retrieving contents of a specific mission folder"""
    print_test("Get Mission Folder Contents")
    
    mission_path = "mission_alpha"
    response = requests.get(f"{BASE_URL}/images/{mission_path}")
    
    print(f"Status Code: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"Current Path: {data.get('current_path')}")
        
        folders = data.get('folders', [])
        images = data.get('images', [])
        
        print(f"\nFolders: {len(folders)}")
        for folder in folders:
            print(f"  📁 {folder['name']}")
        
        print(f"\nImages: {len(images)}")
        for image in images:
            print(f"  🖼️ {image['name']} -> {image['url']}")
        
        print("✓ Mission contents retrieval successful")
    else:
        print("✗ Failed to retrieve mission contents")


def test_5_create_subfolder_structure():
    """Test creating a subfolder structure with images"""
    print_test("Create Subfolder Structure")
    
    subfolders = [
        "mission_alpha/terrain",
        "mission_alpha/analysis",
        "mission_beta/raw",
        "mission_beta/processed"
    ]
    
    for subfolder_path in subfolders:
        with open(test_image_path, "rb") as f:
            files = {"file": (f"image.jpg", f, "image/jpeg")}
            # Extract mission name and create the path
            parts = subfolder_path.split("/")
            mission = parts[0]
            # You would need to create subdirectories separately
            # For now, this tests the basic upload
            params = {"mission_name": subfolder_path}
            
            response = requests.post(f"{BASE_URL}/images/upload", files=files, params=params)
            status = "✓" if response.status_code == 200 else "✗"
            print(f"{status} {subfolder_path}: {response.status_code}")


def test_6_error_handling():
    """Test error handling"""
    print_test("Error Handling")
    
    # Test 1: Invalid file type
    print("\n1. Uploading invalid file type:")
    test_file = "test.txt"
    with open(test_file, "w") as f:
        f.write("This is a text file")
    
    with open(test_file, "rb") as f:
        files = {"file": (test_file, f, "text/plain")}
        params = {"mission_name": "test_mission"}
        response = requests.post(f"{BASE_URL}/images/upload", files=files, params=params)
        print(f"  Status: {response.status_code}")
        print(f"  Response: {response.json()}")
    
    os.remove(test_file)
    
    # Test 2: Path traversal attempt (security test)
    print("\n2. Path traversal attempt:")
    response = requests.get(f"{BASE_URL}/images/../../etc/passwd")
    print(f"  Status: {response.status_code}")
    print(f"  Blocked: {response.status_code == 403}")
    
    # Test 3: Non-existent folder
    print("\n3. Accessing non-existent folder:")
    response = requests.get(f"{BASE_URL}/images/non_existent_mission")
    print(f"  Status: {response.status_code}")
    print(f"  Response: {response.json()}")


def test_7_navigate_subfolder():
    """Test navigating into subfolders"""
    print_test("Navigate Subfolder Structure")
    
    # First, get root to see what's available
    response = requests.get(f"{BASE_URL}/images")
    if response.status_code == 200:
        data = response.json()
        
        # Pick first folder and navigate to it
        folders = [item for item in data.get('items', []) if item['type'] == 'folder']
        if folders:
            first_folder = folders[0]
            print(f"Navigating to: {first_folder['path']}")
            
            response = requests.get(f"{BASE_URL}/images/{first_folder['path']}")
            print(f"Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print(f"Found {len(data.get('images', []))} images")
                print(f"Found {len(data.get('folders', []))} subfolders")
                print("✓ Navigation successful")


def run_all_tests():
    """Run all tests in sequence"""
    print("\n" + "="*60)
    print("IMAGE MANAGEMENT API TEST SUITE")
    print("="*60)
    
    try:
        # Test basic connectivity
        response = requests.get(f"{BASE_URL}/")
        print(f"\nBackend Status: {response.status_code}")
        print(f"Response: {response.json()}")
        
        # Run tests
        test_1_upload_image()
        test_2_upload_multiple()
        test_3_get_root_directory()
        test_4_get_mission_contents()
        # test_5_create_subfolder_structure()  # Requires manual subfolder creation
        test_6_error_handling()
        test_7_navigate_subfolder()
        
        print("\n" + "="*60)
        print("TEST SUITE COMPLETE")
        print("="*60)
        
    except requests.exceptions.ConnectionError:
        print("\n✗ Could not connect to backend at", BASE_URL)
        print("Make sure the FastAPI server is running on http://localhost:8000")
    except Exception as e:
        print(f"\n✗ Error during testing: {str(e)}")


if __name__ == "__main__":
    # Note: Install PIL if not already installed: pip install Pillow
    run_all_tests()
