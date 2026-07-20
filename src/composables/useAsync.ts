import { ref, onMounted, type Ref } from 'vue'

// Standard fetch-on-mount state used by every data view: data (null until loaded),
// a friendly error string, and loading. Centralizes the try/catch/finally + error
// normalization that was duplicated across views.
export function useAsync<T>(fetcher: () => Promise<T>) {
  const data = ref<T | null>(null) as Ref<T | null>
  const error = ref('')
  const loading = ref(true)
  onMounted(async () => {
    try {
      data.value = await fetcher()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Something went wrong'
    } finally {
      loading.value = false
    }
  })
  return { data, error, loading }
}
