const Selector = ({ onClick, name, config }) => {
    return (
        <span
        className={`inline-block px-3 py-1 text-xs font-medium rounded-full italic transition-colors cursor-pointer ${
          config === name 
            ? "bg-blue-600 text-white" 
            : "bg-blue-50 text-blue-600 hover:bg-blue-100"
        }`}
        onClick={() => onClick(`${name}`)}
        role="button"
        tabIndex={0}
      >
        {name}
      </span>
    )
  }
  
  export default Selector
  