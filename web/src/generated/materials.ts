import rawMaterials from './materials.json'

export interface MaterialHeading {
  depth: number
  title: string
  slug: string
}

export interface Material {
  file: string
  slug: string
  title: string
  headings: MaterialHeading[]
  content: string
}

export const materials = rawMaterials as Material[]
