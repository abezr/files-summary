/**
 * Context retrieval for knowledge graph mode.
 * 
 * @semantic-role retrieval
 * @algorithm
 * 1. Identify relevant entities for a query
 * 2. Retrieve connected nodes within N hops
 * 3. Rank by relevance (edge weight, source overlap)
 * 4. Return top K relevant facts
 * 
 * @version 2.1
 */

import type { KnowledgeGraph, GraphNode, FileSummary, Logger } from './types.js';

/**
 * Retrieve relevant context from knowledge graph.
 * 
 * @semantic-role retrieval
 * @input Knowledge graph and query clusters
 * @output Filtered summaries with relevant context
 * 
 * @algorithm
 * 1. For each cluster, identify top entities
 * 2. Build subgraph (2-hop neighborhood)
 * 3. Rank facts by entity overlap
 * 4. Return top-ranked facts for LLM input
 * 
 * @example
 * ```typescript
 * const context = retrieveContext(graph, summaries, logger);
 * // Use context for LLM conclusions generation
 * ```
 */
export function retrieveContext(
  graph: KnowledgeGraph,
  summaries: FileSummary[],
  logger?: Logger
): {
  relevantFacts: string[];
  entityCounts: Record<string, number>;
} {
  if (graph.nodes.length === 0) {
    return {
      relevantFacts: [],
      entityCounts: {}
    };
  }
  
  // Extract all entities mentioned in summaries
  const entityMentions = new Map<string, number>();
  
  summaries.forEach(summary => {
    const allText = [
      summary.summary,
      ...summary.keyFacts,
      ...summary.insights
    ].join(' ').toLowerCase();
    
    graph.nodes.forEach(node => {
      const label = node.label.toLowerCase();
      const pattern = new RegExp(`\\b${escapeRegex(label)}\\b`, 'g');
      const matches = allText.match(pattern);
      
      if (matches) {
        entityMentions.set(node.id, (entityMentions.get(node.id) || 0) + matches.length);
      }
    });
  });
  
  // Rank entities by mention count
  const rankedEntities = Array.from(entityMentions.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20); // Top 20 entities
  
  // Build entity labels map
  const entityLabels: Record<string, number> = {};
  rankedEntities.forEach(([nodeId, count]) => {
    const node = graph.nodes.find(n => n.id === nodeId);
    if (node) {
      entityLabels[node.label] = count;
    }
  });
  
  // Extract facts that mention top entities
  const relevantFacts: string[] = [];
  const seenFacts = new Set<string>();
  
  summaries.forEach(summary => {
    summary.keyFacts.forEach(fact => {
      const factLower = fact.toLowerCase();
      
      // Check if fact mentions any top entity
      const hasRelevantEntity = rankedEntities.some(([nodeId]) => {
        const node = graph.nodes.find(n => n.id === nodeId);
        if (!node) return false;
        
        const label = node.label.toLowerCase();
        return factLower.includes(label);
      });
      
      if (hasRelevantEntity && !seenFacts.has(fact)) {
        relevantFacts.push(fact);
        seenFacts.add(fact);
      }
    });
  });
  
  if (logger) {
    logger.info('context_retrieval_complete', {
      topEntities: rankedEntities.length,
      relevantFacts: relevantFacts.length,
      totalSummaries: summaries.length
    });
  }
  
  return {
    relevantFacts: relevantFacts.slice(0, 50), // Limit to top 50
    entityCounts: entityLabels
  };
}

/**
 * Escape regex special characters.
 * 
 * @semantic-role helper
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Build entity co-occurrence matrix for cluster summary.
 * 
 * @semantic-role analysis
 * @input Knowledge graph
 * @output Co-occurrence matrix
 */
export function buildCoOccurrenceMatrix(
  graph: KnowledgeGraph
): Map<string, Map<string, number>> {
  const matrix = new Map<string, Map<string, number>>();
  
  // Initialize matrix
  graph.nodes.forEach(node => {
    matrix.set(node.id, new Map());
  });
  
  // Populate from edges
  graph.edges.forEach(edge => {
    const sourceMap = matrix.get(edge.source);
    if (sourceMap) {
      sourceMap.set(edge.target, edge.weight);
    }
    
    const targetMap = matrix.get(edge.target);
    if (targetMap) {
      targetMap.set(edge.source, edge.weight);
    }
  });
  
  return matrix;
}
