import { LineChart } from 'lucide-react'

function App() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-background p-6">
      <section className="w-full max-w-md rounded-xl border bg-card p-8 text-center text-card-foreground shadow-sm">
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <LineChart className="size-6" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Stock Tracker</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Project foundation is ready. Phase 1 will build the application UI.
        </p>
      </section>
    </main>
  )
}

export default App
