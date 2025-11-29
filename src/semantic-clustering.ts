/**
 * Semantic clustering for knowledge graph entities.
 * 
 * @semantic-role clustering
 * @algorithm
 * 1. Convert entity labels to embeddings (simple BOW for MVP)
 * 2. Apply K-means clustering
 * 3. Calculate cluster coherence scores
 * 4. Label clusters based on centroid
 * 
 * @version 2.1
 */

import { kmeans } from 'ml-kmeans';
import type { GraphNode, EntityCluster, Logger } from './types.js';

// Simple stopword removal (fallback)
const commonStopwords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'is', 'was', 'are', 'were', 'been', 'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those']);

function removeStopwords(words: string[]): string[] {
  return words.filter(w => !commonStopwords.has(w.toLowerCase()));
}

/**
 * Cluster graph nodes semantically.
 * 
 * @semantic-role clustering
 * @input Array of GraphNode objects
 * @output Array of EntityCluster objects
 * 
 * @algorithm
 * 1. Build vocabulary from all node labels
 * 2. Convert labels to BOW vectors
 * 3. Apply K-means with k = sqrt(n/2)
 * 4. Assign nodes to clusters
 * 5. Calculate cluster coherence
 * 6. Generate cluster labels
 * 
 * @example
 * ```typescript
 * const clusters = clusterEntities(graphNodes, logger);
 * clusters.forEach(c => {
 *   console.log(`Cluster: ${c.label} (${c.entities.length} entities)`);
 * });
 * ```
 */
export function clusterEntities(
  nodes: GraphNode[],
  logger?: Logger
): EntityCluster[] {
  if (nodes.length < 3) {
    // Not enough nodes for clustering
    return [{
      id: 'cluster_0',
      label: 'All Entities',
      entities: nodes,
      centroid: [],
      coherenceScore: 1.0
    }];
  }
  
  // Build vocabulary
  const vocabulary = new Set<string>();
  const documents = nodes.map(node => {
    const words = node.label.toLowerCase().split(/\s+/);
    const filtered = removeStopwords(words as string[]);
    filtered.forEach((w: string) => vocabulary.add(w));
    return filtered;
  });
  
  const vocabArray = Array.from(vocabulary);
  
  // Convert to BOW vectors
  const vectors = documents.map(doc => {
    const vector = new Array(vocabArray.length).fill(0);
    doc.forEach((word: string) => {
      const index = vocabArray.indexOf(word);
      if (index !== -1) {
        vector[index] = 1;
      }
    });
    return vector;
  });
  
  // Determine optimal K (heuristic: sqrt(n/2))
  const k = Math.max(2, Math.min(Math.floor(Math.sqrt(nodes.length / 2)), 10));
  
  // Apply K-means
  let result;
  try {
    result = kmeans(vectors, k, { initialization: 'kmeans++' });
  } catch (error) {
    // Fallback: single cluster
    if (logger) {
      logger.warn('clustering_failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        nodeCount: nodes.length
      });
    }
    return [{
      id: 'cluster_0',
      label: 'All Entities',
      entities: nodes,
      centroid: [],
      coherenceScore: 1.0
    }];
  }
  
  // Build clusters
  const clusters: EntityCluster[] = [];
  const clusterMap = new Map<number, GraphNode[]>();
  
  result.clusters.forEach((clusterId: number, index: number) => {
    if (!clusterMap.has(clusterId)) {
      clusterMap.set(clusterId, []);
    }
    clusterMap.get(clusterId)!.push(nodes[index]);
  });
  
  clusterMap.forEach((entities, clusterId) => {
    const centroid = result.centroids[clusterId];
    
    // Generate cluster label from most common words
    const allWords = entities.flatMap(e => e.label.toLowerCase().split(/\s+/));
    const wordCounts = new Map<string, number>();
    allWords.forEach(w => {
      if (w.length > 3) {
        wordCounts.set(w, (wordCounts.get(w) || 0) + 1);
      }
    });
    
    const topWords = Array.from(wordCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([word]) => word);
    
    const label = topWords.length > 0
      ? topWords.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' & ')
      : `Cluster ${clusterId}`;
    
    // Calculate coherence score (simplified: avg distance from centroid)
    const distances = entities.map((_, index) => {
      const nodeIndex = nodes.indexOf(entities[index]);
      const vector = vectors[nodeIndex];
      return euclideanDistance(vector, centroid);
    });
    
    const avgDistance = distances.reduce((sum, d) => sum + d, 0) / distances.length;
    const coherenceScore = Math.max(0, 1 - (avgDistance / 2)); // Normalize to 0-1
    
    clusters.push({
      id: `cluster_${clusterId}`,
      label,
      entities,
      centroid,
      coherenceScore
    });
  });
  
  if (logger) {
    logger.info('semantic_clustering_complete', {
      totalNodes: nodes.length,
      clusterCount: clusters.length,
      avgClusterSize: (nodes.length / clusters.length).toFixed(2),
      avgCoherence: (clusters.reduce((sum, c) => sum + c.coherenceScore, 0) / clusters.length).toFixed(2)
    });
  }
  
  return clusters;
}

/**
 * Calculate Euclidean distance between two vectors.
 * 
 * @semantic-role helper
 */
function euclideanDistance(a: number[], b: number[]): number {
  if (a.length !== b.length) return Infinity;
  
  const sum = a.reduce((acc, val, i) => acc + Math.pow(val - b[i], 2), 0);
  return Math.sqrt(sum);
}

/**
 * Get top entities from each cluster for digest summary.
 * 
 * @semantic-role formatting
 * @input Array of EntityCluster
 * @output Object mapping cluster labels to top entity labels
 */
export function getTopEntitiesPerCluster(
  clusters: EntityCluster[],
  topN: number = 5
): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  
  clusters.forEach(cluster => {
    // Sort entities by source count (more sources = more important)
    const sorted = cluster.entities
      .sort((a, b) => b.sources.length - a.sources.length)
      .slice(0, topN);
    
    result[cluster.label] = sorted.map(e => e.label);
  });
  
  return result;
}
