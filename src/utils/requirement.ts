import { exec } from "child_process";

// Function to check if Terraform is installed
function checkTerraformInstalled(): Promise<boolean> {
	return new Promise((resolve, reject) => {
		// Execute the 'terraform --version' command
		exec("terraform --version", (error, stdout, stderr) => {
			if (error) {
				// If an error occurs, assume Terraform is not installed
				resolve(false);
			} else {
				// If the command succeeds, check if the output mentions Terraform
				if (stdout.toLowerCase().includes("terraform")) {
					resolve(true);
				} else {
					resolve(false);
				}
			}
		});
	});
}

// // Usage example
// async function main() {
// const isInstalled = await checkTerraformInstalled();
//     if (isInstalled) {
//         console.log('Terraform is installed.');
//     } else {
//         console.log('Terraform is not installed. Please install it to proceed.');
//     }
// }

// main().catch((err) => {
//     console.error('An error occurred:', err);
// });
// console.log('Checking if Terraform is installed...');

// Function to check if GCP (gcloud) is installed
function checkGCPInstalled(): Promise<boolean> {
	return new Promise((resolve) => {
		// Execute the 'gcloud --version' command
		exec("gcloud --version", (error, stdout) => {
			if (error) {
				// If an error occurs, assume gcloud is not installed
				resolve(false);
			} else {
				// If the command succeeds, check if the output mentions gcloud
				resolve(stdout.toLowerCase().includes("google cloud"));
			}
		});
	});
}

// Usage example
// async function main() {
//     try {
//         const isInstalled = await checkGCPInstalled();
//         if (isInstalled) {
//             console.log('Google Cloud SDK (gcloud) is installed.');
//         } else {
//             console.log('Google Cloud SDK (gcloud) is not installed. Please install it to proceed.');
//         }
//     } catch (err) {
//         console.error('An error occurred:', err);
//     }
// }

// main();

function checkGitinstalled(): Promise<boolean> {
	return new Promise((resolve) => {
		// Execute the 'git --version' command
		exec("git --version", (error, stdout) => {
			if (error) {
				// If an error occurs, assume git is not installed
				resolve(false);
			} else {
				// If the command succeeds, check if the output mentions git
				resolve(stdout.toLowerCase().includes("git"));
			}
		});
	});
}

function isGCloudLoggedIn(): Promise<boolean> {
	return new Promise((resolve, reject) => {
		// Execute the 'gcloud auth list' command
		exec("gcloud auth list --format=json", (error, stdout) => {
			if (error) {
				// If an error occurs, assume the user is not logged in
				resolve(false);
			} else {
				try {
					// Parse the JSON output to check for active accounts
					const accounts = JSON.parse(stdout);
					const activeAccount = accounts.find((account: any) => account.status === "ACTIVE");
					resolve(!!activeAccount); // Resolve true if an active account is found
				} catch (err) {
					reject(`Failed to parse output: ${err}`);
				}
			}
		});
	});
}

function isGhInstalled(): Promise<boolean> {
	return new Promise((resolve) => {
		exec("gh --version", (error) => {
			if (error) {
				resolve(false); // Resolve false if the command fails
			} else {
				resolve(true); // Resolve true if the command succeeds
			}
		});
	});
}

function isGhLoggedIn(): Promise<boolean> {
	return new Promise((resolve, reject) => {
		exec("gh auth status --show-token", (error, stdout) => {
			if (error) {
				// If an error occurs, assume the user is not logged in
				resolve(false);
			} else {
				try {
					// Check for the presence of an authentication token or successful login message
					const isLoggedIn = stdout.includes("Logged in to") && stdout.includes("Token");
					resolve(isLoggedIn);
				} catch (err) {
					reject(`Failed to parse output: ${err}`);
				}
			}
		});
	});
}

export { checkTerraformInstalled, checkGCPInstalled, checkGitinstalled, isGCloudLoggedIn, isGhInstalled, isGhLoggedIn };
