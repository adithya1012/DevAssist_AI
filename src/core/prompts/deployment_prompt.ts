import osName from "os-name";
import defaultShell from "default-shell";
import os from "os";

export const DEPLOY_PROMPT = async (cwd: string) => `
Following information explicitly provided for the delpoy_to_cloud tool:

Current Working Directory: ${cwd}

User requested for Deploy this application in Cloud. We need to host this application in GCP Compute Engine. 

When you call deploy_to_cloud tool, you will be provided the necessary infomations like git repository URL.

User requested for Deploy this application in Cloud. We need to host this application in GCP Compute Engine. 

Prerequisites on User's Machine:
- Google Cloud SDK (gcloud) is installed.
- Google Cloud SDK (gcloud auth list --format=json) is configured with a project.

====

OBJECTIVE:

- Deploy the application on GCP.
    - Use gcloud to create the Compute Engine and deploy the application.
    - Create a starter script to automate the deployment process.
    - Clone the repository to a GCP Compute Engine and run the application.
    - Ensure the application running on the VM is accessible from the internet.

====

RULES:

- If the application type (e.g., Node.js, Flask, etc.) is not immediately clear, inspect the git repository files or using the list_files tool and read_file tool read the relevant files to understand the application type.
- Write a shell script to automate the setup process, ensuring the VM is properly configured to run the application. The script should consider the following scenarios:
    - To clone the application from github repository we need to have git installed in the VM, so git need to be installed before doing any git operation.   
    - If the repository contains a requirements.txt file for Python dependencies, install Python first, then use pip3 to install the dependencies. Ensure that Python3 is used, and if necessary, create an alias for python3.
    - If the application is based on nodejs to run the command npm install we need to have nodejs installed in the VM. Hence you need to install nodejs first.
    - The shell script should ensure all necessary software is installed and the application is properly set up for execution. Writing the script is most important part of this task. you SHOULD do it carefully.
- Use gcloud CLI to create the Compute Engine. Execute the command using the execute_command tool. This command should:
    - Create a VM instance.
    - Expose the necessary port to allow external access to the application.
    - You know which port the running application will be acceessable in VM. Hence you need to enable specific port to access the application though gcloud command.
- Break down the shell script task into smaller, more explicit sections:
    - Install necessary software (Git, Python, Node.js, JAVA etc,.).
    - Clone the repository.
    - Install dependencies (use pip3 for Python, npm for Node.js, jvm for JAVA etc,.).
    - Run the application (go to the correct folder using cd command and ensure the correct startup command is used).
    - Expose the application to the internet by opening necessary ports (If necessary).
    - Ensure the shell script is well-structured, with clear comments and explanations for each step. This script should be able to run without any manual intervention.

====

Following is the example command to deploy the application in GCP Compute Engine: (DO NOT ADD ADDITIONAL PARAMETERS LIKE NETWORK, SUBNET, ETC., ONLY FILL THE REQUIRED PARAMETERS)
gcloud compute instances create <fill VM name> --zone=us-east1-c --machine-type=e2-micro --scopes=cloud-platform --tags=http-server,web-server --metadata-from-file=startup-script=<fill path to .sh file created>

Following is the example shell script for flask application: (DO NOT USE THE SAME SCRIPT FOR OTHER THEN FLASK APPLICATION. CRETAE YOUR OWN SCRIPT TO SUPPORT APPLICATIONS)
#!/bin/bash
APP_DIR=<fill path in VM>
REPO_URL= <fill repository URL>
APP_PORT=<fill port number>
echo "Starting setup for calculator application..."
echo "Updating package list and installing required packages..."
sudo apt-get update -y
sudo apt-get install -y python3 python3-pip git python3-venv gunicorn ufw
echo "Configuring firewall to allow traffic on port $APP_PORT..."
sudo ufw allow $APP_PORT
sudo ufw --force enable
echo "Setting up application directory at $APP_DIR..."
sudo mkdir -p "$APP_DIR"
sudo chown -R $USER:$USER "$APP_DIR"
cd "$APP_DIR"
if ! git clone "$REPO_URL" .; then
    echo "Error: Failed to clone repository from $REPO_URL" >&2
    exit 1
fi
echo "Creating and activating virtual environment..."
python3 -m venv venv
source venv/bin/activate
echo "Installing dependencies..."
pip install --no-cache-dir flask gunicorn
echo "Starting the application using Gunicorn..."
nohup gunicorn --bind 0.0.0.0:$APP_PORT app:app > "$APP_DIR/gunicorn.log" 2>&1 &
    `;
