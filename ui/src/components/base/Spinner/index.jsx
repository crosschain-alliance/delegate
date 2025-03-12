export default function Spinner({ size = "sm" }) {
  return (
    <div
      className={`${size === "sm" ? "w-4 h-4" : size === "md" ? "w-6 h-6" : "w-8-h-8"} border-4 border-blue-500 border-t-transparent rounded-full animate-spin`}
    ></div>
  )
}
