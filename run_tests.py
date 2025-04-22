import subprocess
import time
import pytest
import requests
import sys
# # minikube start  
def deploy_app():
    subprocess.run(["minikube", "start", "--driver=docker", "--preload=false"], check=True)
    subprocess.run(["minikube", "ip"], check=True)
    subprocess.run(["docker", "build", "-t", "malcolmcfraser/mf-node-app-template:latest", "."], check=True)
    subprocess.run(["docker", "push","malcolmcfraser/mf-node-app-template:latest"], check=True)
    subprocess.run(["kubectl", "apply", "-f", "./node-app-template-artifacts/mysql-statefulset.yaml"], check=True) # path to statefulset
    time.sleep(10) # Wait for mysql stateful set and services before deploying the app.
    subprocess.run(["kubectl", "apply", "-f", "./node-app-template-artifacts/node-app.yaml"], check=True)# path to node-deployment-template
    subprocess.run(["kubectl", "wait", "--for=condition=available", "--timeout=120s", "deployment/mf-node-app"], check=True)
    
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
            time.sleep(10)
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
    ##exit_code = pytest.main(["test_api.py", "-v"])
    sys.exit(pytest.main(sys.argv[1:]))
