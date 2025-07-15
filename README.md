# 🚀 Features

 - JWT Authentication – Login returns a token for authenticated routes
 
 - User Management – Register and unregister users securely

 - Helm Chart – Update helm chart values file
 
 - MySQL Integration – Persistent data layer
 
 - Rate Limiting – Prevent brute-force attacks
 
 - CI/CD Pipeline – GitHub Actions with Minikube simulation
 
 - Integration Testing – Automated test suite with Pytest
 
 - Self-contained Deployment – Start Minikube, deploy, and test automatically via run_tests.py

<pre> 📁 Project Structure   
 .
├── index.js                        # Main Express app with auth endpoints
├── test_api.py                     # API-level integration tests (Pytest)
├── run_tests.py                    # Deploys app to Minikube and runs tests
├── requirements.txt                # Python dependencies for testing
├── .github/
│   └── workflows/
│       └── ci-cd.yaml              # GitHub Actions pipeline config
└── node-app-template-artifacts/
    ├── node-app.yaml               # Kubernetes Deployment/Service for Node.js app
    └── mysql-statefulset.yaml      # Kubernetes StatefulSet for MySQL
  </pre>

# ⚙️ API Endpoints 

- Method	Endpoint	Description	Auth Required 

- POST	/register	Register a new user	

- POST	/login	Log in and receive JWT	

- DELETE	/unregister	Delete own user account	

- GET     /products  Get all products

- POST    /products  Add product (admin-only)

- GET     /cart  Get user's cart

- POST    /products  Add product to cart

# 🧪 Running Tests Locally

## 🐳 Prerequisites

- Docker

- Python 3.8+

- Minikube (Docker driver)

- kubectl

- Node.js and npm


## 🔍 Run Local Tests
Install dependencies:
  
- pip install -r requirements.txt


## Run the full test and deploy cycle:
  
- python run_tests.py

     This script will:
     
     - Start Minikube
      
     - Build and push the Docker image
      
     - Deploy MySQL and the Node.js app to Kubernetes
      
     - Wait for pods and services to be ready
      
     - Execute all integration tests

## ✅ Test Coverage
- Tests included in test_api.py:

    👤 User Registration & Authentication
          ✅ Register a new user
          → test_register_success

          🚫 Prevent duplicate usernames
          → test_register_duplicate

          🔐 Login with valid credentials
          → test_login_success (as fixture)

          🔐 Login with invalid password
          → test_login_invalid_password

          🔐 Login with non-existent user
          → test_login_nonexistent_user

     🛒 Product and Cart
          🆕 Add a new product with valid token
          → test_add_product_success

          🆕 Get product list (with at least one product)
          → test_get_products_success (as fixture)

          🆕 Add item to cart and verify cart content
          → test_get_cart_with_items

     🧼 Account Cleanup
          🧼 Unregister a user with valid JWT
          → test_unregister_user

The service URL and NodePort are automatically detected using kubectl and minikube.

# ⚡ GitHub Actions Pipeline
Located at .github/workflows/ci-cd.yaml, this pipeline runs on every push or pull_request:

 ## ✅ Sets up Minikube
 
 ## 🔒 Injects secrets into Kubernetes (jwt-secret, mysql-secret)
 
 ## 🐍 Creates Python virtual environment and installs dependencies
 
 ## 🧪 Runs integration tests
 
 ## 🔑 GitHub Secrets Required
 
   - Secret Name	Description
   
   - MYSQL_HOST	MySQL host address
   
   - MYSQL_USER	MySQL username
   
   - MYSQL_PASSWORD	MySQL password
   
   - MYSQL_DATABASE	MySQL database name
   
   - JWT_SECRET	JWT signing secret
   
   - DOCKER_USERNAME	Docker Hub username (for image push)
   
   - DOCKER_PASSWORD	Docker Hub password or access token

# 🐳 Docker Image
## To build and push the Docker image:

- docker build -t malcolmcfraser/mf-node-app-template:latest .

- docker push malcolmcfraser/mf-node-app-template:latest

- This image is used in the Kubernetes deployment manifest.


# ☸️ Kubernetes Deployment
## Your Kubernetes manifests include:

 - statefulset.yaml – MySQL StatefulSet with persistent storage
 
 - node-app.yaml – Node.js API Deployment and NodePort Service

 - hpa.yaml – Horizontal Pod Autoscaler

 - ingress.yaml – Horizontal Pod Autoscaler
 
 - secrets (e.g., DB credentials, JWT secret) are injected using:
     - Environment variables
     - Github secrets


# 🔐 Security Highlights
JWT tokens signed with a server secret

 - Passwords hashed with bcrypt
 
 - Rate limiting to prevent brute-force attacks
 
 - Kubernetes Secrets for config separation
 
 - Isolated environments via CI/CD pipeline

# 📌 TODOs
 
 -  Add Postman collection and OpenAPI docs
 
 - Expand test data reusability and clean-up logic

# 👥 Author

Maintained by a DevOps engineer passionate about cloud-native deployments, automation, and secure architecture.
