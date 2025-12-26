# JupyterHub configuration for Computing 7155 Portal
# This file configures JupyterHub to work with the portal

c = get_config()

# Basic configuration
c.JupyterHub.ip = '0.0.0.0'
c.JupyterHub.port = 8000

# Use simple authentication for development
# In production, configure OAuth or LDAP
c.JupyterHub.authenticator_class = 'jupyterhub.auth.DummyAuthenticator'

# Allow any password in development
c.DummyAuthenticator.password = "password"

# Spawner configuration
c.JupyterHub.spawner_class = 'jupyterhub.spawner.SimpleLocalProcessSpawner'

# Notebook directory
c.Spawner.notebook_dir = '~/notebooks'

# Default URL to open
c.Spawner.default_url = '/lab'

# Allowed users (in production, sync with MongoDB users)
c.Authenticator.allowed_users = {'student', 'teacher', 'admin'}
c.Authenticator.admin_users = {'admin'}

# Timeout settings
c.Spawner.start_timeout = 60
c.Spawner.http_timeout = 30

# Cull idle notebooks after 30 minutes
c.JupyterHub.services = [
    {
        'name': 'cull-idle',
        'admin': True,
        'command': [
            'python3', '-m', 'jupyterhub_idle_culler',
            '--timeout=1800',
            '--cull-every=300',
            '--max-age=0',
        ],
    }
]

# Security settings
c.JupyterHub.cookie_secret_file = '/srv/jupyterhub/jupyterhub_cookie_secret'
c.JupyterHub.db_url = 'sqlite:////srv/jupyterhub/jupyterhub.sqlite'

# Logging
c.JupyterHub.log_level = 'INFO'

# API tokens for external access (used by the portal)
# Generate with: openssl rand -hex 32
# c.JupyterHub.api_tokens = {
#     'portal-token': 'your-generated-token-here'
# }
