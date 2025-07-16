export default function TestRoutePage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Test Route Works!</h1>
      <p>If you can see this, the routing system is working.</p>
      <p>Time: {new Date().toLocaleString()}</p>
    </div>
  )
} 