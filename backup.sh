#!/bin/bash

echo "=========================================="
echo "💾 Runner vs Attacker - Project Backup"
echo "=========================================="

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="runner_backup_$TIMESTAMP.zip"

echo "📦 Creating backup: $BACKUP_NAME"

# Zip the project, excluding node_modules and git folder
# Using PowerShell for zip compression on Windows if zip command is not available, 
# but assuming git bash environment which usually has zip. 
# If not, we might need a different approach, but let's try standard zip first.

# Create a temporary directory for backup
TEMP_DIR="temp_backup_$TIMESTAMP"
mkdir "$TEMP_DIR"

echo "📂 Copying files to temporary directory..."
# Copy files using rsync if available, or cp
# Using cp -r with exclusions is tricky in standard bash without rsync
# So we will copy everything and then remove node_modules and .git
cp -r . "$TEMP_DIR"

# Remove excluded directories from temp
rm -rf "$TEMP_DIR/server/node_modules"
rm -rf "$TEMP_DIR/.git"
rm -rf "$TEMP_DIR/.vscode"
rm -rf "$TEMP_DIR/$TEMP_DIR" # Avoid recursive copy if it happened

echo "📦 Compressing..."
if command -v zip &> /dev/null; then
    cd "$TEMP_DIR"
    zip -r "../$BACKUP_NAME" .
    cd ..
else
    echo "⚠️  'zip' command not found. Using PowerShell..."
    # Use absolute path for destination to avoid confusion
    ABS_DEST="$(pwd)/$BACKUP_NAME"
    # Convert to Windows path format for PowerShell
    # Assuming standard git bash path like /c/Users/...
    WIN_DEST=$(echo "$ABS_DEST" | sed 's/^\///' | sed 's/\//\\/g' | sed 's/^./&:/')
    
    # If path starts with /mnt/c/ (WSL), convert it
    if [[ "$ABS_DEST" == "/mnt/"* ]]; then
        WIN_DEST=$(echo "$ABS_DEST" | sed 's/^\/mnt\///' | sed 's/\//\\/g' | sed 's/^./&:/')
    fi

    cd "$TEMP_DIR"
    powershell.exe -command "Compress-Archive -Path . -DestinationPath '$WIN_DEST' -CompressionLevel Optimal -Force"
    cd ..
fi

# Cleanup
rm -rf "$TEMP_DIR"

if [ -f "$BACKUP_NAME" ]; then
    echo "=========================================="
    echo "✅ Backup created successfully: $BACKUP_NAME"
    echo "=========================================="
else
    echo "❌ Backup failed."
    exit 1
fi
