// src/utils/routeBatcher.js

// Enhanced batch processing with adaptive delays and error handling
export async function batchRouteRequests(items, requestFn, batchSize = 2, minIntervalMs = 2000, onBatchStart) {
  const results = [];
  const errors = [];
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchNumber = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(items.length / batchSize);
    
    if (onBatchStart) {
      onBatchStart(i + 1, {
        batchNumber,
        totalBatches,
        itemsInBatch: batch.length,
        completedItems: i,
        totalItems: items.length
      });
    }
    
    console.log(`Processing batch ${batchNumber}/${totalBatches} (${batch.length} items)...`);
    
    try {
      // Process batch items in parallel but with limited concurrency
      const batchPromises = batch.map(async (item, index) => {
        try {
          const result = await requestFn(item);
          return { success: true, result, item, index: i + index };
        } catch (error) {
          console.error(`Error processing item ${i + index + 1}:`, error.message);
          return { success: false, error, item, index: i + index };
        }
      });
      
      const batchResults = await Promise.allSettled(batchPromises);
      
      // Separate successful results from errors
      batchResults.forEach((result, batchIndex) => {
        if (result.status === 'fulfilled') {
          if (result.value.success) {
            results.push(result.value);
          } else {
            errors.push(result.value);
          }
        } else {
          errors.push({
            success: false,
            error: result.reason,
            item: batch[batchIndex],
            index: i + batchIndex
          });
        }
      });
      
      // Adaptive delay based on batch success rate
      if (i + batchSize < items.length) {
        const successRate = batchResults.filter(r => 
          r.status === 'fulfilled' && r.value.success
        ).length / batchResults.length;
        
        // Increase delay if success rate is low, decrease if high
        const adaptiveDelay = successRate < 0.5 ? minIntervalMs * 2 : 
                             successRate > 0.8 ? minIntervalMs * 0.8 : minIntervalMs;
        
        console.log(`Batch ${batchNumber} completed. Success rate: ${(successRate * 100).toFixed(1)}%. Waiting ${Math.round(adaptiveDelay)}ms...`);
        await new Promise(res => setTimeout(res, adaptiveDelay));
      }
      
    } catch (batchError) {
      console.error(`Batch ${batchNumber} failed:`, batchError.message);
      // Add all items in this batch to errors
      batch.forEach((item, batchIndex) => {
        errors.push({
          success: false,
          error: batchError,
          item,
          index: i + batchIndex
        });
      });
    }
  }
  
  console.log(`Batch processing completed. ${results.length} successful, ${errors.length} failed.`);
  
  return {
    results,
    errors,
    successCount: results.length,
    errorCount: errors.length,
    totalCount: items.length,
    successRate: results.length / items.length
  };
}
