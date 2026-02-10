// Simple swipe utility for touch and mouse interactions
export class SwipeUtils {
  static addSwipeHandler(element, onSwipeLeft, onSwipeRight) {
    let startX = 0;
    let startY = 0;
    let currentX = 0;
    let currentY = 0;
    let isDragging = false;
    let startTime = 0;

    // Mouse events
    const handleMouseDown = (e) => {
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      startTime = Date.now();
      element.style.cursor = 'grabbing';
      element.style.transition = 'none';
    };

    const handleMouseMove = (e) => {
      if (!isDragging) return;
      
      currentX = e.clientX - startX;
      currentY = e.clientY - startY;
      
      // Apply transform
      const rotation = currentX * 0.1;
      element.style.transform = `translateX(${currentX}px) translateY(${currentY}px) rotate(${rotation}deg)`;
      
      // Add visual feedback
      if (currentX > 100) {
        element.style.boxShadow = '0 10px 40px rgba(76, 175, 80, 0.4)';
      } else if (currentX < -100) {
        element.style.boxShadow = '0 10px 40px rgba(244, 67, 54, 0.4)';
      } else {
        element.style.boxShadow = '0 10px 30px rgba(0,0,0,0.3)';
      }
    };

    const handleMouseUp = () => {
      if (!isDragging) return;
      
      isDragging = false;
      element.style.cursor = 'grab';
      element.style.transition = 'all 0.3s ease-out';
      
      const deltaTime = Date.now() - startTime;
      const deltaX = currentX;
      const deltaY = currentY;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      const velocity = distance / deltaTime;
      
      // Determine if it's a swipe
      const isSwipe = Math.abs(deltaX) > 100 || (Math.abs(deltaX) > 50 && velocity > 0.5);
      
      if (isSwipe) {
        if (deltaX > 0) {
          // Swipe right
          element.style.transform = 'translateX(500px) rotate(30deg) scale(0.8)';
          element.style.opacity = '0';
          onSwipeRight();
        } else {
          // Swipe left
          element.style.transform = 'translateX(-500px) rotate(-30deg) scale(0.8)';
          element.style.opacity = '0';
          onSwipeLeft();
        }
      } else {
        // Snap back to center
        element.style.transform = 'translateX(0) translateY(0) rotate(0deg)';
        element.style.boxShadow = '0 10px 30px rgba(0,0,0,0.3)';
      }
      
      // Reset values
      currentX = 0;
      currentY = 0;
    };

    // Touch events
    const handleTouchStart = (e) => {
      const touch = e.touches[0];
      isDragging = true;
      startX = touch.clientX;
      startY = touch.clientY;
      startTime = Date.now();
      element.style.transition = 'none';
    };

    const handleTouchMove = (e) => {
      if (!isDragging) return;
      
      const touch = e.touches[0];
      currentX = touch.clientX - startX;
      currentY = touch.clientY - startY;
      
      // Apply transform
      const rotation = currentX * 0.1;
      element.style.transform = `translateX(${currentX}px) translateY(${currentY}px) rotate(${rotation}deg)`;
      
      // Add visual feedback
      if (currentX > 100) {
        element.style.boxShadow = '0 10px 40px rgba(76, 175, 80, 0.4)';
      } else if (currentX < -100) {
        element.style.boxShadow = '0 10px 40px rgba(244, 67, 54, 0.4)';
      } else {
        element.style.boxShadow = '0 10px 30px rgba(0,0,0,0.3)';
      }
      
      e.preventDefault();
    };

    const handleTouchEnd = () => {
      if (!isDragging) return;
      
      isDragging = false;
      element.style.transition = 'all 0.3s ease-out';
      
      const deltaTime = Date.now() - startTime;
      const deltaX = currentX;
      const deltaY = currentY;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      const velocity = distance / deltaTime;
      
      // Determine if it's a swipe
      const isSwipe = Math.abs(deltaX) > 100 || (Math.abs(deltaX) > 50 && velocity > 0.5);
      
      if (isSwipe) {
        if (deltaX > 0) {
          // Swipe right
          element.style.transform = 'translateX(500px) rotate(30deg) scale(0.8)';
          element.style.opacity = '0';
          onSwipeRight();
        } else {
          // Swipe left
          element.style.transform = 'translateX(-500px) rotate(-30deg) scale(0.8)';
          element.style.opacity = '0';
          onSwipeLeft();
        }
      } else {
        // Snap back to center
        element.style.transform = 'translateX(0) translateY(0) rotate(0deg)';
        element.style.boxShadow = '0 10px 30px rgba(0,0,0,0.3)';
      }
      
      // Reset values
      currentX = 0;
      currentY = 0;
    };

    // Add event listeners
    element.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    element.addEventListener('touchstart', handleTouchStart, { passive: false });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd);
    
    // Return cleanup function
    return () => {
      element.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }
}
