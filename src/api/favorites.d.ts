declare module '@/api/favorites' {
  export function toggleFavorite(
    name: string,
    designId: number,
    userId: number | undefined,
    isFavorite: boolean
  ): Promise<any>
} 