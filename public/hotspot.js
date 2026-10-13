(function (root) {
  // A cover image is scaled, then cropped according to its background position.
  // Project the original image point through that exact transform.
  function positionOffset(position, remainingSpace) {
    if (position.endsWith('%')) return remainingSpace * parseFloat(position) / 100;
    if (position === 'center') return remainingSpace / 2;
    if (position === 'right' || position === 'bottom') return remainingSpace;
    if (position === 'left' || position === 'top') return 0;
    return parseFloat(position) || 0;
  }

  function projectImagePoint({ width, height, imageWidth, imageHeight, imageX, imageY, positionX = '50%', positionY = '50%' }) {
    const scale = Math.max(width / imageWidth, height / imageHeight);
    const renderedWidth = imageWidth * scale;
    const renderedHeight = imageHeight * scale;
    return {
      x: positionOffset(positionX, width - renderedWidth) + imageX * renderedWidth,
      y: positionOffset(positionY, height - renderedHeight) + imageY * renderedHeight
    };
  }

  function attachImageHotspot(container, marker) {
    const image = new Image();
    let frame = 0;
    function update() {
      frame = 0;
      if (!image.naturalWidth || !image.naturalHeight) return;
      const style = getComputedStyle(container);
      const point = projectImagePoint({
        width: container.clientWidth, height: container.clientHeight,
        imageWidth: image.naturalWidth, imageHeight: image.naturalHeight,
        imageX: Number(marker.dataset.imageX), imageY: Number(marker.dataset.imageY),
        positionX: style.backgroundPositionX, positionY: style.backgroundPositionY
      });
      marker.style.left = `${point.x}px`;
      marker.style.top = `${point.y}px`;
      const label = marker.querySelector('span');
      if (label?.offsetWidth) {
        const halfWidth = label.offsetWidth / 2;
        const labelCenter = Math.min(container.clientWidth - 16 - halfWidth, Math.max(16 + halfWidth, point.x));
        marker.style.setProperty('--label-shift', `${labelCenter - point.x}px`);
      }
      marker.dataset.positioned = String(point.x >= 0 && point.x <= container.clientWidth && point.y >= 0 && point.y <= container.clientHeight);
    }
    function schedule() {
      if (!frame) frame = requestAnimationFrame(update);
    }
    image.addEventListener('load', schedule);
    image.src = container.dataset.photoSrc;
    if (image.complete) schedule();
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(schedule) : null;
    observer?.observe(container);
    window.addEventListener('resize', schedule);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', schedule);
      image.removeEventListener('load', schedule);
      if (frame) cancelAnimationFrame(frame);
    };
  }

  const api = { projectImagePoint, attachImageHotspot };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.HotelHotspot = api;
})(typeof globalThis === 'object' ? globalThis : this);
