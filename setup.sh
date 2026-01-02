#!/bin/bash

# CallInsight AI Setup Script
# This script helps you set up the application quickly

set -e

echo "🚀 CallInsight AI - Setup Script"
echo "================================"
echo ""

# Check if Docker is installed
if command -v docker &> /dev/null; then
    echo "✓ Docker found"
    HAS_DOCKER=true
else
    echo "✗ Docker not found"
    HAS_DOCKER=false
fi

# Check if PostgreSQL is installed
if command -v psql &> /dev/null; then
    echo "✓ PostgreSQL found"
    HAS_POSTGRES=true
else
    echo "✗ PostgreSQL not found"
    HAS_POSTGRES=false
fi

echo ""
echo "Setup Options:"
echo "1. Use Docker PostgreSQL (recommended if Docker is available)"
echo "2. Use local PostgreSQL (requires PostgreSQL installed)"
echo "3. Use remote PostgreSQL (I have a connection string)"
echo "4. Exit"
echo ""

read -p "Choose an option (1-4): " choice

case $choice in
    1)
        if [ "$HAS_DOCKER" = false ]; then
            echo "❌ Docker is not installed. Please install Docker first or choose another option."
            exit 1
        fi
        
        echo ""
        echo "🐳 Starting PostgreSQL in Docker..."
        
        # Check if container already exists
        if docker ps -a | grep -q callinsight-db; then
            echo "Container already exists. Starting it..."
            docker start callinsight-db
        else
            docker run --name callinsight-db \
                -e POSTGRES_PASSWORD=callinsight \
                -e POSTGRES_USER=riddler \
                -e POSTGRES_DB=callinsight \
                -p 5432:5432 \
                -d postgres:16
        fi
        
        echo "Waiting for PostgreSQL to start..."
        sleep 5
        
        # Prompt for credentials
        echo ""
        read -p "Enter your OpenAI API key: " openai_key
        echo ""
        echo "Admin user credentials (for seeding database):"
        read -p "Admin email [admin@scandiweb.com]: " admin_email
        admin_email=${admin_email:-admin@scandiweb.com}
        read -sp "Admin password [option123!]: " admin_password
        admin_password=${admin_password:-option123!}
        echo ""
        read -p "Admin name [Admin User]: " admin_name
        admin_name=${admin_name:-Admin User}
        
        # Generate session secret
        session_secret=$(openssl rand -base64 32)
        
        # Update .env file
        cat > .env << EOF
DATABASE_URL="postgresql://riddler:callinsight@localhost:5432/callinsight?schema=public"
OPENAI_API_KEY="$openai_key"
SESSION_SECRET="$session_secret"
ADMIN_EMAIL="$admin_email"
ADMIN_PASSWORD="$admin_password"
ADMIN_NAME="$admin_name"
EOF
        ;;
        
    2)
        if [ "$HAS_POSTGRES" = false ]; then
            echo "❌ PostgreSQL is not installed. Please install it first or choose another option."
            exit 1
        fi
        
        echo ""
        echo "📦 Setting up local PostgreSQL..."
        
        # Prompt for database password
        read -p "Enter password for PostgreSQL user 'riddler' (will be created): " db_password
        
        # Try to create database and user
        if command -v sudo &> /dev/null; then
            sudo -u postgres psql -c "CREATE DATABASE callinsight;" 2>/dev/null || echo "Database may already exist"
            sudo -u postgres psql -c "CREATE USER riddler WITH PASSWORD '$db_password';" 2>/dev/null || echo "User may already exist"
            sudo -u postgres psql -c "ALTER USER riddler WITH PASSWORD '$db_password';" 2>/dev/null || true
            sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE callinsight TO riddler;" 2>/dev/null || true
        else
            psql -c "CREATE DATABASE callinsight;" 2>/dev/null || echo "Database may already exist"
            psql -c "CREATE USER riddler WITH PASSWORD '$db_password';" 2>/dev/null || echo "User may already exist"
            psql -c "ALTER USER riddler WITH PASSWORD '$db_password';" 2>/dev/null || true
            psql -c "GRANT ALL PRIVILEGES ON DATABASE callinsight TO riddler;" 2>/dev/null || true
        fi
        
        # Prompt for OpenAI API key
        echo ""
        read -p "Enter your OpenAI API key: " openai_key
        
        # Prompt for admin credentials
        echo ""
        echo "Admin user credentials (for seeding database):"
        read -p "Admin email [admin@scandiweb.com]: " admin_email
        admin_email=${admin_email:-admin@scandiweb.com}
        read -sp "Admin password [option123!]: " admin_password
        admin_password=${admin_password:-option123!}
        echo ""
        read -p "Admin name [Admin User]: " admin_name
        admin_name=${admin_name:-Admin User}
        
        # Generate session secret
        session_secret=$(openssl rand -base64 32)
        
        # Update .env file
        cat > .env << EOF
DATABASE_URL="postgresql://riddler:$db_password@localhost:5432/callinsight?schema=public"
OPENAI_API_KEY="$openai_key"
SESSION_SECRET="$session_secret"
ADMIN_EMAIL="$admin_email"
ADMIN_PASSWORD="$admin_password"
ADMIN_NAME="$admin_name"
EOF
        ;;
        
    3)
        echo ""
        read -p "Enter your PostgreSQL connection string: " db_url
        
        # Prompt for OpenAI API key
        echo ""
        read -p "Enter your OpenAI API key: " openai_key
        
        # Prompt for admin credentials
        echo ""
        echo "Admin user credentials (for seeding database):"
        read -p "Admin email [admin@scandiweb.com]: " admin_email
        admin_email=${admin_email:-admin@scandiweb.com}
        read -sp "Admin password [option123!]: " admin_password
        admin_password=${admin_password:-option123!}
        echo ""
        read -p "Admin name [Admin User]: " admin_name
        admin_name=${admin_name:-Admin User}
        
        # Generate session secret
        session_secret=$(openssl rand -base64 32)
        
        # Update .env file
        cat > .env << EOF
DATABASE_URL="$db_url"
OPENAI_API_KEY="$openai_key"
SESSION_SECRET="$session_secret"
ADMIN_EMAIL="$admin_email"
ADMIN_PASSWORD="$admin_password"
ADMIN_NAME="$admin_name"
EOF
        ;;
        
    4)
        echo "Exiting..."
        exit 0
        ;;
        
    *)
        echo "Invalid option"
        exit 1
        ;;
esac

echo ""
echo "✓ Database configuration saved to .env"
echo ""
echo "📦 Installing dependencies..."
npm install

echo ""
echo "🗄️ Pushing database schema..."
npm run db:push

echo ""
echo "🌱 Seeding database with sample data..."
npm run db:seed

echo ""
echo "✅ Setup complete!"
echo ""
echo "🚀 To start the application:"
echo "   npm run dev"
echo ""
echo "📖 Then visit: http://localhost:3000"
echo ""
echo "🔑 Login with the credentials you configured:"
echo "   Email: $admin_email"
echo "   Password: [the password you entered]"
echo ""
echo "⚠️  Note: Your credentials are stored in .env (never commit this file!)"
echo ""

