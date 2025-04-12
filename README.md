🔐 Node.js Auth API with JWT, MySQL, and CI/CD via GitHub Actions + Minikube
This project provides a secure and scalable Node.js REST API with user authentication backed by MySQL, integrated with a full Kubernetes deployment pipeline and end-to-end tests.

🚀 Features
JWT Authentication – Login returns a token for authenticated routes

User Management – Register and unregister users securely

MySQL Integration – Persistent data layer

Rate Limiting – Prevent brute-force attacks

CI/CD Pipeline – GitHub Actions with Minikube simulation

Integration Testing – Automated test suite with Pytest

Self-contained Deployment – Start Minikube, deploy, and test automatically via run_tests.py

📁 Project Structure
bash
Copy
Edit
.
├── index.js                          # Main Express app with auth endpoints
├── test_api.py                       # API-level integration tests (Pytest)
├── run_tests.py                      # Deploys app to Minikube and runs tests
├── requirements.txt                  # Python dependencies for testing
├── .github/
│   └── workflows/
│       └── ci-cd.yaml                # GitHub Actions pipeline config
└── node-app-template-artifacts/
    ├── node-app.yaml                 # Kubernetes Deployment/Service for Node.js app
    └── mysql-statefulset.yaml       # Kubernetes StatefulSet for MySQL
⚙️ API Endpoints
Method	Endpoint	Description	Auth Required
POST	/register	Register a new user	❌
POST	/login	Log in and receive JWT	❌
DELETE	/unregister	Delete own user account	✅
🧪 Running Tests Locally
🐳 Prerequisites
Docker

Python 3.8+

Minikube (Docker driver)

kubectl

Node.js and npm

🔍 Run Local Tests
Install dependencies:

bash
Copy
Edit
pip install -r requirements.txt
Run the full test and deploy cycle:

bash
Copy
Edit
python run_tests.py
This script:

Starts Minikube

Builds and pushes the Docker image

Deploys MySQL and the Node.js app to Kubernetes

Waits for pods and services to be ready

Executes all integration tests

✅ Test Coverage
Tests included in test_api.py:

✅ Register a new user

🚫 Prevent duplicate usernames

🔐 Login with valid/invalid credentials

🧼 Unregister a user with valid JWT

The service URL and node port are automatically detected using kubectl and minikube.

⚡ GitHub Actions Pipeline (.github/workflows/ci-cd.yaml)
This pipeline runs on every push or pull_request:

✅ Sets up Minikube

🔒 Injects secrets into Kubernetes (jwt-secret, mysql-secret)

🐍 Creates a Python virtual environment and installs test dependencies

🧪 Runs integration tests

🔑 GitHub Secrets Required
Secret Name	Description
MYSQL_HOST	MySQL host address
MYSQL_USER	MySQL username
MYSQL_PASSWORD	MySQL password
MYSQL_DATABASE	MySQL database name
JWT_SECRET	JWT signing secret
DOCKER_USERNAME	Docker Hub username (for image push)
DOCKER_PASSWORD	Docker Hub password or access token
🐳 Docker Image
The app builds into a Docker image:

bash
Copy
Edit
docker build -t malcolmcfraser/mf-node-app-template:latest .
docker push malcolmcfraser/mf-node-app-template:latest
This image is used in the Kubernetes deployment manifest.

☸️ Kubernetes Deployment
Your Kubernetes manifests include:

mysql-statefulset.yaml – MySQL StatefulSet with persistent storage

node-app.yaml – Node.js API Deployment and NodePort Service

Secrets like database credentials and JWT secrets are injected using kubectl create secret.

🔐 Security Highlights
JWT tokens signed with server secret

Passwords hashed with bcrypt

Rate limiting protects against brute-force

Kubernetes Secrets for config separation

CI/CD pipeline keeps environment isolated

📌 TODOs
 Add Helm chart support

 Add Postman collection and OpenAPI docs

 Expand test data reusability and clean-up logic

 Add unit tests for Node.js logic

👥 Author
Maintained by a DevOps engineer passionate about cloud-native deployments, automation, and secure architecture.

