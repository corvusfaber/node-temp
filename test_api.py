import pytest
import requests
import time
import subprocess

# Change ip adress here based on Minikube setup.
USERNAME = "testuser7"
TOKEN = ""

def get_service_url():
    ip = subprocess.check_output(["minikube", "ip"]).decode().strip()
    port = subprocess.check_output(["kubectl", "get", "svc", "mf-node-app-service", "-o", "jsonpath={.spec.ports[0].nodePort}"]).decode().strip()
    return f"http://{ip}:{port}"

BASE_URL = get_service_url() 
# Wait for the service to be ready.
def wait_for_service(url, timeout=30):
    start_time = time.time()
    while time.time() - start_time < timeout:
        try:
            response = requests.get(url + "/register", timeout=2)
            if response.status_code in [200, 400, 404]: 
                return True
        except requests.ConnectionError:
            time.sleep(1)
    raise Exception ("Service not ready within timeout")

@pytest.fixture(scope="module")
def api_base_url():
    wait_for_service(BASE_URL)
    return BASE_URL

def test_register_success(api_base_url):
    payload = {"username": USERNAME, "password": "testpassword", "isAdmin": True}
    response = requests.post(f"{api_base_url}/register", json=payload) #wait
    assert response.status_code == 201
    assert response.text == "User registered"

def test_register_duplicate(api_base_url):
    payload = {"username": USERNAME, "password": "testpassword"}
    response = requests.post(f"{api_base_url}/register", json=payload)
    assert response.status_code == 409
    assert response.text == "Username already exists"

@pytest.fixture()
def test_login_success(api_base_url):
    payload = {"username": USERNAME, "password": "testpassword"}
    response = requests.post(f"{api_base_url}/login", json=payload)
    assert response.status_code == 200, f"Login failed: {response.text}"
    data = response.json()
    assert "token" in data, "No token returned in response"
    return data["token"]
    
def test_login_invalid_password(api_base_url):
    payload = {"username": USERNAME, "password": "wrongpassword"}
    response = requests.post(f"{api_base_url}/login", json=payload)
    assert response.status_code == 401
    assert response.text == "Invalid username or password"

def test_login_nonexistent_user(api_base_url):
    payload = {"username": "nonexistantuser", "password": "wrongpassword"}
    response = requests.post(f"{api_base_url}/login", json=payload)
    assert response.status_code == 401
    assert response.text == "Invalid username or password"

def test_add_product_success(api_base_url, test_login_success):
    product = {
        "name": "New Product",
        "description": "A new product",
        "price": 30.99,
        "stock": 50,
        "image_url": "http://example.com/new.jpg"
    }
    headers = {"Authorization": f"Bearer {test_login_success}"}
    response = requests.post(f"{api_base_url}/products", json=product, headers=headers)
    assert response.status_code == 201
    assert response.text == "Product added"

@pytest.fixture()
def test_get_products_success(api_base_url, test_login_success):
    response = requests.get(f"{api_base_url}/products")
    assert response.status_code == 200
    assert len(response.json()) >= 1
    assert response.json()[0]["name"] == "New Product"#
    return response.json()
    
##Tests for POST and GET /cart
def test_get_cart_with_items(api_base_url, test_login_success, test_get_products_success):
    # Add an item to the cart
    auth_token = test_login_success
    test_product = test_get_products_success
    payload = {"product_id": test_product[0]["id"], "quantity": 2}
    headers = {"Authorization": f"Bearer {auth_token}"}
    response = requests.post(f"{api_base_url}/cart", json=payload, headers=headers)
    assert response.status_code == 201, f"Failed to add item to cart: {response.text}"

    # Get cart
    response = requests.get(f"{api_base_url}/cart", headers=headers)
    assert response.status_code == 200, f"Failed to fetch cart: {response.text}"
    assert len(response.json()) == 1, "Expected exactly one item in cart"
    assert response.json()[0]["product_id"] == test_product[0]["id"], "Product ID mismatch"
    assert response.json()[0]["quantity"] == 2, "Quantity mismatch"
    assert response.json()[0]["name"] == test_product[0]["name"], "Product name mismatch"
    assert response.json()[0]["price"] == test_product[0]["price"], "Product price mismatch"
    
def test_unregister_user(api_base_url, test_login_success):
    headers = {"Authorization": f"Bearer {test_login_success}"}
    response = requests.delete(f"{api_base_url}/unregister", headers=headers)
    assert response.status_code == 200
    assert response.text == "User deleted successfully."
