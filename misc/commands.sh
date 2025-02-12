# GHAS commands
node witcher.js -m ghas -a status -r all
node witcher.js -m ghas -a status -r offsec-sast-testing
node witcher.js -m ghas -a enable -r offsec-sast-testing
node witcher.js -m ghas -a disable -r offsec-sast-testing


# Secret Scanning commands
node witcher.js -m secret-scanning -a status -r all
node witcher.js -m secret-scanning -a status -r offsec-sast-testing
node witcher.js -m secret-scanning -a enable -r offsec-sast-testing
node witcher.js -m secret-scanning -a disable -r offsec-sast-testing


# Dependabot Commands
node witcher.js -m dependabot -a status -r all
node witcher.js -m dependabot -a status -r offsec-sast-testing
node witcher.js -m dependabot -a enable -r offsec-sast-testing
node witcher.js -m dependabot -a disable -r offsec-sast-testing
node witcher.js -m dependabot -a deploy --jira-ticket PROJECT-123 -r offsec-sast-testing
node witcher.js -m dependabot -a delete --jira-ticket PROJECT-123 -r offsec-sast-testing


# CodeQL Commands
node witcher.js -m codeql -a status -r all
node witcher.js -m codeql -a status -r offsec-sast-testing
node witcher.js -m codeql -a enable -r offsec-sast-testing
node witcher.js -m codeql -a disable -r offsec-sast-testing
node witcher.js -m codeql -a deploy -r offsec-sast-testing --jira-ticket PROJECT-123
node witcher.js -m codeql -a delete -r offsec-sast-testing --jira-ticket PROJECT-123


# Workflows Commands
node witcher.js -m workflows -a status -r offsec-sast-code --workflow-file codeql.yml
node witcher.js -m workflows -a enable -r offsec-sast-code --workflow-file codeql.yml
node witcher.js -m workflows -a disable -r offsec-sast-code --workflow-file codeql.yml

# IAC
node witcher.js -m iac -a status -r all
node witcher.js -m iac -a status -r offsec-sast-testing
node witcher.js -m iac -a enable -r offsec-sast-testing
node witcher.js -m iac -a disable -r offsec-sast-testing
node witcher.js -m iac -a deploy -r offsec-sast-testing --jira-ticket PROJECT-123
node witcher.js -m iac -a delete -r offsec-sast-testing --jira-ticket PROJECT-123

# CodeQL Alerts
node witcher.js -m codeql -a alerts -r all
node witcher.js -m codeql -a alerts -r all --jira --slack


# Daily Summary
node witcher.js --daily-summary -m ALL -a status
node witcher.js --daily-summary -m ALL -a status --slack --jira

# Mass Action
node witcher.js --mass-action -a disable -m ghas --repo-file mass_action.txt --jira-ticket PROJECT-123
node witcher.js --mass-action -a enable -m ghas --repo-file mass_action.txt --jira-ticket PROJECT-123
node witcher.js --mass-action -a deploy -m codeql --repo-file mass_action.txt --jira-ticket PROJECT-123
node witcher.js --mass-action -a delete -m dependabot --repo-file mass_action.txt --jira-ticket PROJECT-123


