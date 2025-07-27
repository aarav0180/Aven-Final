import json
import hashlib
import time
import os
from typing import Optional, Dict, Any

class ResponseCache:
    def __init__(self, cache_file: str = "response_cache.json", ttl_hours: int = 24):
        """
        Initialize the response cache.
        
        Args:
            cache_file (str): File to persist cache data
            ttl_hours (int): Time to live for cache entries in hours
        """
        self.cache_file = cache_file
        self.ttl_seconds = ttl_hours * 3600
        self.cache: Dict[str, Dict[str, Any]] = {}
        self.load_cache()
    
    def _generate_key(self, query: str, context: str = "") -> str:
        """
        Generate a cache key from query and context.
        
        Args:
            query (str): User query
            context (str): Additional context (domain, user_id, etc.)
            
        Returns:
            str: Cache key
        """
        # Combine query and context, then hash
        combined = f"{query.lower().strip()}:{context.lower().strip()}"
        return hashlib.md5(combined.encode()).hexdigest()
    
    def get(self, query: str, context: str = "") -> Optional[str]:
        """
        Get cached response for a query.
        
        Args:
            query (str): User query
            context (str): Additional context
            
        Returns:
            Optional[str]: Cached response or None if not found/expired
        """
        key = self._generate_key(query, context)
        
        if key in self.cache:
            entry = self.cache[key]
            # Check if entry is expired
            if time.time() - entry['timestamp'] < self.ttl_seconds:
                return entry['response']
            else:
                # Remove expired entry
                del self.cache[key]
                self.save_cache()
        
        return None
    
    def set(self, query: str, response: str, context: str = ""):
        """
        Cache a response for a query.
        
        Args:
            query (str): User query
            response (str): AI response
            context (str): Additional context
        """
        key = self._generate_key(query, context)
        
        self.cache[key] = {
            'query': query,
            'response': response,
            'context': context,
            'timestamp': time.time()
        }
        
        self.save_cache()
    
    def load_cache(self):
        """Load cache from file."""
        try:
            if os.path.exists(self.cache_file):
                with open(self.cache_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    # Filter out expired entries
                    current_time = time.time()
                    self.cache = {
                        k: v for k, v in data.items() 
                        if current_time - v['timestamp'] < self.ttl_seconds
                    }
        except Exception as e:
            print(f"Error loading cache: {e}")
            self.cache = {}
    
    def save_cache(self):
        """Save cache to file."""
        try:
            with open(self.cache_file, 'w', encoding='utf-8') as f:
                json.dump(self.cache, f, indent=2, ensure_ascii=False)
        except Exception as e:
            print(f"Error saving cache: {e}")
    
    def clear_expired(self):
        """Remove expired entries from cache."""
        current_time = time.time()
        expired_keys = [
            k for k, v in self.cache.items() 
            if current_time - v['timestamp'] >= self.ttl_seconds
        ]
        
        for key in expired_keys:
            del self.cache[key]
        
        if expired_keys:
            self.save_cache()
    
    def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics."""
        current_time = time.time()
        active_entries = sum(
            1 for entry in self.cache.values() 
            if current_time - entry['timestamp'] < self.ttl_seconds
        )
        
        return {
            'total_entries': len(self.cache),
            'active_entries': active_entries,
            'cache_size_mb': os.path.getsize(self.cache_file) / (1024 * 1024) if os.path.exists(self.cache_file) else 0
        } 