import osName from "os-name";
import defaultShell from "default-shell";
import os from "os";

export const DEPLOY_PROMPT = async (
	cwd: string
) => `Hello DevAssist,

Git Repository: https://github.com/adithya1012/calculator-app

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

- 
====
`;

`
- You will get back the execute_command result. See where the application is running and give user the details through attempt_completion tool.
`;