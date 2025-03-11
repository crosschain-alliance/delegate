const Modal = ({ isOpen, onClose, children }) => {
  if (!isOpen) return null

  const handleOverlayClick = () => {
    onClose()
  }

  const handleModalContentClick = (e) => {
    e.stopPropagation()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={handleOverlayClick}>
      <div className="absolute inset-0 bg-white/30 backdrop-blur-sm" />
      <div
        className="relative max-h-[80vh] w-11/12 max-w-lg overflow-y-auto rounded bg-white p-6 shadow-md md:w-1/2"
        onClick={handleModalContentClick}
      >
        {children}
      </div>
    </div>
  )
}

export default Modal
