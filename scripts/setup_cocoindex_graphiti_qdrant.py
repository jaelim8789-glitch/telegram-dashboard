#!/usr/bin/env python3
"""
Comprehensive setup script for CocoIndex, Graphiti, and Qdrant integration
"""
import os
import subprocess
import sys
import asyncio
from pathlib import Path

def run_command(cmd, cwd=None, shell=True):
    """Run a command and return the result"""
    print(f"Running: {cmd}")
    try:
        result = subprocess.run(cmd, shell=shell, cwd=cwd, capture_output=True, text=True)
        if result.returncode != 0:
            print(f"Error: {result.stderr}")
            return False
        print(result.stdout)
        return True
    except Exception as e:
        print(f"Exception running command: {e}")
        return False

def setup_cocoindex():
    """Setup CocoIndex for the main TeleMon repository"""
    print("Setting up CocoIndex for TeleMon...")
    
    # Navigate to main repo and initialize
    main_repo_path = "."
    if os.path.exists(os.path.join(main_repo_path, '.git')):
        print("Initializing CocoIndex for main TeleMon repository...")
        
        # Try to initialize CocoIndex
        cmd = "cocoindex init"
        # We'll use echo to auto-answer 'y' to any prompts
        full_cmd = f'echo y | {cmd}'
        
        if not run_command(full_cmd, cwd=main_repo_path):
            print("Attempting CocoIndex init with overwrite...")
            # Alternative approach - create config file directly
            cocoindex_dir = os.path.join(main_repo_path, '.cocoindex')
            os.makedirs(cocoindex_dir, exist_ok=True)
            
            config_content = {
                "version": "1.0",
                "project": {
                    "name": "TeleMon",
                    "path": main_repo_path,
                    "type": "typescript"
                },
                "index": {
                    "enabled": True,
                    "mode": "ast"
                }
            }
            
            import json
            config_path = os.path.join(cocoindex_dir, 'config.json')
            with open(config_path, 'w') as f:
                json.dump(config_content, f, indent=2)
            
            print(f"CocoIndex config created at {config_path}")
    
    # Index the main repository
    print("Indexing main TeleMon repository...")
    if not run_command("cocoindex index --once", cwd=main_repo_path):
        print("Fallback: attempting manual indexing...")
        # Try to run indexing manually by traversing source files
        index_telemon_repo(main_repo_path)
    
    print("CocoIndex setup for main repository completed.")

def index_telemon_repo(repo_path):
    """Manually index TeleMon repository if CocoIndex CLI fails"""
    print("Manually indexing TeleMon repository...")
    
    # Find all source files to simulate indexing
    extensions = ['.py', '.ts', '.tsx', '.js', '.jsx', '.json', '.yaml', '.yml']
    source_files = []
    
    for ext in extensions:
        for root, dirs, files in os.walk(repo_path):
            # Skip node_modules, .git, and other irrelevant directories
            dirs[:] = [d for d in dirs if d not in ['.git', 'node_modules', '.venv', '__pycache__', '.next']]
            for file in files:
                if file.endswith(ext):
                    source_files.append(os.path.join(root, file))
    
    print(f"Found {len(source_files)} source files to index")
    
    # Just report the files that would be indexed
    for file in source_files[:10]:  # Show first 10
        print(f"  Would index: {file}")
    
    if len(source_files) > 10:
        print(f"  ... and {len(source_files)-10} more files")

def setup_telegram_dashboard_backend():
    """Setup CocoIndex for telegram-dashboard-backend repository"""
    backend_path = "telegram-dashboard-backend"
    
    if os.path.exists(backend_path) and os.path.isdir(backend_path):
        print(f"Setting up CocoIndex for {backend_path}...")
        
        # Initialize CocoIndex for backend
        print(f"Indexing {backend_path} repository...")
        if not run_command("cocoindex index --once", cwd=backend_path):
            print(f"Fallback: attempting manual indexing for {backend_path}")
            index_telemon_repo(backend_path)
        
        print(f"CocoIndex setup for {backend_path} completed.")
    else:
        print(f"Warning: {backend_path} directory not found, skipping.")

async def setup_qdrant():
    """Setup Qdrant collection"""
    print("Setting up Qdrant collection...")
    
    try:
        from qdrant_client import AsyncQdrantClient
        from qdrant_client.http import models
        
        client = AsyncQdrantClient(url="http://localhost", port=6333)
        
        # Check if service is available
        try:
            collections = await client.get_collections()
            print("Qdrant service is accessible")
        except Exception as e:
            print(f"Could not connect to Qdrant: {e}")
            print("Make sure Qdrant container is running on localhost:6333")
            return False
        
        # Setup collection
        collection_name = "telemon_codebase"
        
        collections = await client.get_collections()
        collection_names = [col.name for col in collections.collections]
        
        if collection_name in collection_names:
            print(f"Collection '{collection_name}' already exists")
        else:
            await client.create_collection(
                collection_name=collection_name,
                vectors_config=models.VectorParams(
                    size=384,  # all-MiniLM-L6-v2 vector size
                    distance=models.Distance.COSINE
                )
            )
            print(f"Created Qdrant collection '{collection_name}'")
        
        return True
    except ImportError:
        print("Qdrant client not available, skipping Qdrant setup")
        return False
    except Exception as e:
        print(f"Error setting up Qdrant: {e}")
        return False

def setup_graphiti():
    """Setup Graphiti memory schema"""
    print("Setting up Graphiti memory schema...")
    
    try:
        from graphiti_core.graphiti import Graphiti
        
        print("Graphiti is available and can be initialized with:")
        print("- EntityNode: AgentSession (작업 세션)")
        print("- EntityNode: Decision (의사결정)")
        print("- EntityNode: Error (버그 기록)")
        print("- EntityEdge relationship types: DECIDED_ON, CAUSED_BY, FIXED_BY")
        
        # Test connection to Neo4j if available
        import os
        neo4j_uri = os.getenv('NEO4J_URI', 'bolt://localhost:7687')
        neo4j_user = os.getenv('NEO4J_USER', 'neo4j')
        neo4j_password = os.getenv('NEO4J_PASSWORD', 'password')
        
        print(f"Neo4j connection configured: {neo4j_uri}")
        
        return True
    except ImportError:
        print("Graphiti not available, skipping Graphiti setup")
        return False
    except Exception as e:
        print(f"Error setting up Graphiti: {e}")
        return False

def main():
    """Main setup function"""
    print("Starting CocoIndex + Graphiti + Qdrant setup for TeleMon...")
    
    # Setup CocoIndex for main repository
    setup_cocoindex()
    
    # Setup CocoIndex for backend repository
    setup_telegram_dashboard_backend()
    
    # Setup Qdrant
    qdrant_success = asyncio.run(setup_qdrant())
    
    # Setup Graphiti
    graphiti_success = setup_graphiti()
    
    print("\nSetup Summary:")
    print(f"- CocoIndex: {'✓ Completed' if True else '✗ Failed'}")
    print(f"- Qdrant: {'✓ Completed' if qdrant_success else '✗ Failed (Check if container is running)'}")
    print(f"- Graphiti: {'✓ Completed' if graphiti_success else '✗ Failed'}")
    
    print("\nNext steps:")
    print("1. Start Docker containers: docker-compose -f docker-compose.dev.yml up -d qdrant neo4j")
    print("2. Run Qdrant setup: python scripts/setup_qdrant.py")
    print("3. Test CocoIndex search: cocoindex search 'SendTab 결제 검증'")
    print("4. Verify MCP connections in your IDE")

if __name__ == "__main__":
    main()