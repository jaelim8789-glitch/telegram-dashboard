#!/usr/bin/env python3
"""
Script to initialize Graphiti memory schema for TeleMon
"""
from graphiti_core.nodes import EntityNode, EpisodicNode
from graphiti_core.edges import EntityEdge, EpisodicEdge
from graphiti_core.graphiti import Graphiti
from datetime import datetime, timezone


def setup_graphiti_schema():
    """
    Initialize Graphiti with basic memory schema:
    - Nodes: AgentSession (작업 세션), Decision (의사결정), Error (버그 기록)
    - Relationships: DECIDED_ON, CAUSED_BY, FIXED_BY
    """
    print("Setting up Graphiti memory schema...")
    
    # In Graphiti, nodes are created dynamically during episodes/queries
    # The schema is more about the types of entities and relationships we'll use
    print("Graphiti schema includes:")
    print("- EntityNode: AgentSession (작업 세션)")
    print("- EntityNode: Decision (의사결정)") 
    print("- EntityNode: Error (버그 기록)")
    print("- EntityEdge relationship types: DECIDED_ON, CAUSED_BY, FIXED_BY")
    
    print("\nSchema setup complete. Graphiti will create nodes and edges dynamically.")
    

if __name__ == "__main__":
    setup_graphiti_schema()