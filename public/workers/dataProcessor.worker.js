// 웹 워커: CPU 집약적 작업을 백그라운드에서 처리

// 데이터 정렬 작업
function sortData(data, sortBy, order = 'asc') {
  return [...data].sort((a, b) => {
    const aValue = a[sortBy];
    const bValue = b[sortBy];
    
    if (aValue < bValue) {
      return order === 'asc' ? -1 : 1;
    }
    if (aValue > bValue) {
      return order === 'asc' ? 1 : -1;
    }
    return 0;
  });
}

// 데이터 필터링 작업
function filterData(data, filters) {
  return data.filter(item => {
    return Object.entries(filters).every(([key, value]) => {
      if (value === null || value === undefined) return true;
      
      const itemValue = item[key];
      if (typeof value === 'string') {
        return String(itemValue).toLowerCase().includes(value.toLowerCase());
      }
      
      return itemValue === value;
    });
  });
}

// 데이터 그룹화 작업
function groupData(data, groupBy) {
  return data.reduce((acc, item) => {
    const key = item[groupBy];
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(item);
    return acc;
  }, {});
}

// 데이터 집계 작업
function aggregateData(data, aggregations) {
  const result = {};
  
  for (const agg of aggregations) {
    const { field, operation } = agg;
    
    switch (operation) {
      case 'sum':
        result[`${field}_sum`] = data.reduce((sum, item) => sum + Number(item[field] || 0), 0);
        break;
      case 'avg':
        const values = data.map(item => Number(item[field] || 0)).filter(val => !isNaN(val));
        result[`${field}_avg`] = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
        break;
      case 'count':
        result[`${field}_count`] = data.length;
        break;
      case 'min':
        result[`${field}_min`] = Math.min(...data.map(item => Number(item[field] || Infinity)));
        break;
      case 'max':
        result[`${field}_max`] = Math.max(...data.map(item => Number(item[field] || -Infinity)));
        break;
    }
  }
  
  return result;
}

// 메시지 처리
self.onmessage = function(e) {
  const { id, type, payload } = e.data;
  
  try {
    let result;
    
    switch (type) {
      case 'SORT_DATA':
        result = sortData(payload.data, payload.sortBy, payload.order);
        break;
      case 'FILTER_DATA':
        result = filterData(payload.data, payload.filters);
        break;
      case 'GROUP_DATA':
        result = groupData(payload.data, payload.groupBy);
        break;
      case 'AGGREGATE_DATA':
        result = aggregateData(payload.data, payload.aggregations);
        break;
      case 'PROCESS_LARGE_DATASET':
        // 복합 데이터 처리: 필터링 -> 정렬 -> 집계
        const filtered = filterData(payload.data, payload.filters);
        const sorted = sortData(filtered, payload.sortBy, payload.order);
        const aggregated = aggregateData(sorted, payload.aggregations);
        result = { processed: sorted, aggregated };
        break;
      default:
        throw new Error(`Unknown task type: ${type}`);
    }
    
    // 결과를 메인 스레드로 전송
    self.postMessage({ id, type: 'SUCCESS', result });
  } catch (error) {
    // 오류를 메인 스레드로 전송
    self.postMessage({ id, type: 'ERROR', error: error.message });
  }
};