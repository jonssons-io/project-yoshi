import { createFileRoute } from '@tanstack/react-router'
import { ExampleUserForm } from '@/components/form/ExampleUserForm'

export const Route = createFileRoute('/demo/form-system')({
  component: FormSystemDemo,
})

function FormSystemDemo() {
  return (
    <div className="container mx-auto py-10">
      <ExampleUserForm />
    </div>
  )
}
