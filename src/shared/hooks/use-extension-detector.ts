import { useEffect } from 'react';
import { logger } from '@/shared/lib/logger';

/**
 * useExtensionDetector
 * 
 * Aggressively blocks browser extensions that modify the site's appearance
 * (like Dark Reader, Midnight Lizard, Night Eye) to preserve UX/UI integrity.
 */
export function useExtensionDetector() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleReversal = () => {
      const html = document.documentElement;
      const body = document.body;

      // 1. Attribute Removal
      const blockedAttributes = [
        'data-darkreader-mode',
        'data-darkreader-scheme',
        'data-darkreader-proxy-injected',
        'ml-mode',
        'data-ml-theme',
        'nighteye',
      ];

      blockedAttributes.forEach(attr => {
        if (html.hasAttribute(attr)) {
          logger.warn('EXTENSION', `Detected and removed attribute: ${attr}`);
          html.removeAttribute(attr);
        }
      });

      // 2. Style Stripping
      // Dark Reader often adds style tags with specific classes or IDs
      const darkReaderStyles = document.querySelectorAll('.darkreader, #darkreader-style, style[media="screen"]');
      darkReaderStyles.forEach(style => {
        // Be careful not to remove our own styles if they accidentally match
        // Dark Reader usually adds class="darkreader"
        if (style.className.includes('darkreader') || style.id.includes('darkreader')) {
           logger.warn('EXTENSION', 'Removed injected style tag');
           style.remove();
        }
      });

      // 3. Meta Tag Removal
      const metaTags = document.querySelectorAll('meta[name="darkreader"]');
      metaTags.forEach(meta => {
        logger.warn('EXTENSION', 'Removed extension meta tag');
        meta.remove();
      });

      // 4. CSS Reset (Force override filters)
      // We enforce this inline to override external stylesheets
      const resetStyle = 'filter: none !important; mix-blend-mode: normal !important;';
      
      if (html.style.filter !== 'none' || html.style.mixBlendMode !== 'normal') {
          html.style.cssText += resetStyle;
      }
      
      if (body.style.filter !== 'none' || body.style.mixBlendMode !== 'normal') {
          body.style.cssText += resetStyle;
      }
    };

    // Initial cleanup
    handleReversal();

    // 5. Persistent Monitoring with MutationObserver
    const observer = new MutationObserver((mutations) => {
      let shouldReverse = false;

      for (const mutation of mutations) {
        if (mutation.type === 'attributes' && mutation.attributeName) {
          // Check if the changed attribute is one of the blocked ones
          if (
            mutation.attributeName.includes('darkreader') || 
            mutation.attributeName.includes('ml-') || 
            mutation.attributeName === 'nighteye'
          ) {
            shouldReverse = true;
            break;
          }
        } else if (mutation.type === 'childList') {
          // Check for added nodes (styles)
          mutation.addedNodes.forEach(node => {
            if (node.nodeName === 'STYLE') {
              const style = node as HTMLStyleElement;
              if (style.className.includes('darkreader') || style.id.includes('darkreader')) {
                shouldReverse = true;
              }
            }
          });
          if (shouldReverse) break;
        }
      }

      if (shouldReverse) {
        handleReversal();
      }
    });

    // Observe <html> for attribute changes and <head> for style injections
    observer.observe(document.documentElement, { 
      attributes: true, 
      attributeFilter: ['data-darkreader-mode', 'ml-mode', 'nighteye', 'style'] // Also watch style attr
    });
    
    observer.observe(document.head, { 
      childList: true, 
      subtree: true 
    });

    return () => observer.disconnect();
  }, []);
}
