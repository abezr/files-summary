/**
 * Knowledge graph builder for large-scale file processing.
 * 
 * @semantic-role knowledge-graph
 * @algorithm
 * 1. Extract entities from file content
 * 2. Create graph nodes (entities, facts, concepts)
 * 3. Identify relationships between entities
 * 4. Build graph edges with weights
 * 5. Cluster entities semantically
 * 
 * @version 2.1
 * @trigger When batch size > 50 files OR total tokens > 20K
 */

import compromise from 'compromise';
import type { FileContent, KnowledgeGraph, GraphNode, GraphEdge, Logger } from './types.js';

/**
 * Build knowledge graph from file contents.
 * 
 * @semantic-role graph-construction
 * @input Array of FileContent objects
 * @output KnowledgeGraph with nodes, edges, and clusters
 * 
 * @algorithm
 * 1. Extract entities using NLP (compromise.js)
 * 2. Create nodes for each unique entity
 * 3. Identify co-occurrences for edge creation
 * 4. Calculate edge weights based on co-occurrence frequency
 * 5. Semantic clustering (delegated to semantic-clustering module)
 * 
 * @example
 * ```typescript
 * const graph = buildKnowledgeGraph(fileContents, logger);
 * console.log(`Nodes: ${graph.nodes.length}, Edges: ${graph.edges.length}`);
 * ```
 */
export function buildKnowledgeGraph(
  files: FileContent[],
  logger?: Logger
): KnowledgeGraph {
  if (logger) {
    logger.info('knowledge_graph_build_start', {
      fileCount: files.length,
      totalBytes: files.reduce((sum, f) => sum + f.content.length, 0)
    });
  }
  
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const entityMap = new Map<string, GraphNode>();
  const coOccurrences = new Map<string, Map<string, number>>();
  
  // Extract entities from each file
  files.forEach(file => {
    const doc = compromise(file.content);
    
    // Extract people
    const people = doc.people().out('array') as string[];
    people.forEach(person => {
      addOrUpdateNode(person, 'entity', file.metadata.path, entityMap, nodes);
      trackCoOccurrences(person, people, coOccurrences);
    });
    
    // Extract places
    const places = doc.places().out('array') as string[];
    places.forEach(place => {
      addOrUpdateNode(place, 'entity', file.metadata.path, entityMap, nodes);
      trackCoOccurrences(place, places, coOccurrences);
    });
    
    // Extract organizations
    const orgs = doc.organizations().out('array') as string[];
    orgs.forEach(org => {
      addOrUpdateNode(org, 'entity', file.metadata.path, entityMap, nodes);
      trackCoOccurrences(org, orgs, coOccurrences);
    });
    
    // Extract topics (nouns as concepts)
    const topics = doc.nouns().out('array') as string[];
    const topTopics = topics.slice(0, 10); // Limit to top 10 per file
    topTopics.forEach(topic => {
      if (topic.length > 3) { // Filter short noise
        addOrUpdateNode(topic, 'concept', file.metadata.path, entityMap, nodes);
      }
    });
  });
  
  // Build edges from co-occurrences
  coOccurrences.forEach((targets, source) => {
    targets.forEach((count, target) => {
      const sourceNode = entityMap.get(source);
      const targetNode = entityMap.get(target);
      
      if (sourceNode && targetNode && source !== target) {
        // Normalize weight: count / max possible
        const weight = Math.min(count / files.length, 1.0);
        
        edges.push({
          source: sourceNode.id,
          target: targetNode.id,
          type: 'co-occurs',
          weight
        });
      }
    });
  });
  
  if (logger) {
    logger.info('knowledge_graph_build_complete', {
      nodes: nodes.length,
      edges: edges.length,
      entityTypes: {
        entity: nodes.filter(n => n.type === 'entity').length,
        concept: nodes.filter(n => n.type === 'concept').length
      }
    });
  }
  
  // Clustering will be added when semantic-clustering is implemented
  return {
    nodes,
    edges,
    clusters: [] // Will be populated by semantic clustering
  };
}

/**
 * Add or update a graph node.
 * 
 * @semantic-role helper
 */
function addOrUpdateNode(
  label: string,
  type: 'entity' | 'fact' | 'concept',
  source: string,
  entityMap: Map<string, GraphNode>,
  nodes: GraphNode[]
): void {
  const normalized = label.trim().toLowerCase();
  
  if (entityMap.has(normalized)) {
    const node = entityMap.get(normalized)!;
    if (!node.sources.includes(source)) {
      node.sources.push(source);
    }
  } else {
    const node: GraphNode = {
      id: `node_${nodes.length}`,
      type,
      label,
      sources: [source],
      properties: {}
    };
    entityMap.set(normalized, node);
    nodes.push(node);
  }
}

/**
 * Track entity co-occurrences for edge creation.
 * 
 * @semantic-role helper
 */
function trackCoOccurrences(
  entity: string,
  entities: string[],
  coOccurrences: Map<string, Map<string, number>>
): void {
  const normalized = entity.trim().toLowerCase();
  
  if (!coOccurrences.has(normalized)) {
    coOccurrences.set(normalized, new Map());
  }
  
  const targetMap = coOccurrences.get(normalized)!;
  
  entities.forEach(other => {
    const otherNormalized = other.trim().toLowerCase();
    if (normalized !== otherNormalized) {
      targetMap.set(otherNormalized, (targetMap.get(otherNormalized) || 0) + 1);
    }
  });
}

/**
 * Get graph statistics for digest.
 * 
 * @semantic-role statistics
 */
export function getGraphStatistics(graph: KnowledgeGraph): Record<string, number | string> {
  const nodeTypes = graph.nodes.reduce((acc, node) => {
    acc[node.type] = (acc[node.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const avgDegree = graph.nodes.length > 0
    ? (graph.edges.length * 2) / graph.nodes.length
    : 0;
  
  return {
    totalNodes: graph.nodes.length,
    totalEdges: graph.edges.length,
    entities: nodeTypes.entity || 0,
    concepts: nodeTypes.concept || 0,
    averageDegree: avgDegree.toFixed(2),
    clusters: graph.clusters.length
  };
}
