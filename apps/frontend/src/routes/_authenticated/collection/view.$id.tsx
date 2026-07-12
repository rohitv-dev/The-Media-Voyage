import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/collection/view/$id')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/_authenticated/collection/view/$id"!</div>
}
