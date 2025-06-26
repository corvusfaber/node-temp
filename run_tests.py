import subprocess
import time
import pytest
import requests
import sys

def deploy_app():
    # Start minikube.
    subprocess.run(["minikube", "start", "--driver=docker", "--preload=false"], check=True)
    
    # Get Minikube Ip.
    subprocess.run(["minikube", "ip"], check=True)
    
    # Build and push Docker image
    subprocess.run(["docker", "build", "-t", "malcolmcfraser/mf-node-app-template:latest", "."], check=True)
    subprocess.run(["docker", "push","malcolmcfraser/mf-node-app-template:latest"], check=True)
    
    # Deploy Helm chart
    subprocess.run([
        "helm", "upgrade", "--install", "node-app-chart", "./node-app-chart"
    ], check=True)
    
        # Wait for deployment to be ready
    subprocess.run(["kubectl", "rollout", "status", "deployment/mf-node-app", "--timeout=120s"], check=True)

    # Optional: wait for ingress (if you're using it)
    time.sleep(10)

    print("✅ Helm deployment successful.")
    
    # Wait for the pods to be ready
    for _ in range(30):
        pods = subprocess.check_output(["kubectl", "get", "pods"]).decode()
        if "mysql-0" in pods and "node-app" in pods and "Running" in pods:
            break
        time.sleep(5)
    else:
        raise Exception("Pods not ready in time")

def get_service_url():
    ip = subprocess.check_output(["minikube", "ip"]).decode().strip()
    port = subprocess.check_output(["kubectl", "get", "svc", "mf-node-app-service", "-o", "jsonpath={.spec.ports[0].nodePort}"]).decode().strip()
    return f"http://{ip}:{port}"

def wait_for_service(url):
    for _ in range(30):
        try:
            requests.get(url + "/register", timeout=10)
            return
        except requests.ConnectionError:
            time.sleep(30)
    raise Exception("Service not ready")

if __name__ == "__main__":
    print ("Deploying application... ")
    deploy_app()
    BASE_URL =  get_service_url()
    print(f"Service URL: {BASE_URL}")
    wait_for_service(BASE_URL)
    print ("Running tests...")
    with open("test_api.py", "r") as f:
        content = f.read()
    exit_code = pytest.main(["test_api.py", "-v"])
    sys.exit(exit_code)
