#!/usr/bin/env python3
"""
Script to initialize Qdrant collection for TeleMon codebase
"""
import asyncio
from qdrant_client import AsyncQdrantClient
from qdrant_client.http import models


async def setup_qdrant():
    """Initialize Qdrant collection for TeleMon"""
    client = AsyncQdrantClient(url="http://localhost", port=6333)
    
    # Check if collection already exists
    collections = await client.get_collections()
    collection_names = [col.name for col in collections.collections]
    
    collection_name = "telemon_codebase"
    
    if collection_name in collection_names:
        print(f"Collection '{collection_name}' already exists, skipping creation.")
        return
    
    # Create collection with specified parameters
    await client.create_collection(
        collection_name=collection_name,
        vectors_config=models.VectorParams(
            size=384,  # all-MiniLM-L6-v2 vector size
            distance=models.Distance.COSINE
        )
    )
    
    print(f"Created Qdrant collection '{collection_name}' with:")
    print(f"- Vector size: 384")
    print(f"- Distance metric: Cosine")
    

if __name__ == "__main__":
    asyncio.run(setup_qdrant())