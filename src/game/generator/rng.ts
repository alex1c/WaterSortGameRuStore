/** Small deterministic PRNG; generation never uses Math.random(). */
export class SeededRng {
	private state: number

	constructor(seed: number | string) {
		this.state = hashSeed(seed)
	}

	nextUint32(): number {
		this.state = Math.imul(this.state ^ (this.state >>> 16), 0x21f0aaad)
		this.state = Math.imul(this.state ^ (this.state >>> 15), 0x735a2d97)
		return (this.state ^ (this.state >>> 15)) >>> 0
	}

	nextFloat(): number {
		return this.nextUint32() / 0x1_0000_0000
	}

	nextInt(minInclusive: number, maxInclusive: number): number {
		if (maxInclusive < minInclusive) {
			throw new Error('Invalid RNG range')
		}
		return minInclusive + Math.floor(this.nextFloat() * (maxInclusive - minInclusive + 1))
	}

	pick<T>(items: readonly T[]): T {
		if (items.length === 0) {
			throw new Error('Cannot pick from an empty collection')
		}
		return items[this.nextInt(0, items.length - 1)] as T
	}

	shuffle<T>(items: readonly T[]): T[] {
		const result = [...items]
		for (let index = result.length - 1; index > 0; index -= 1) {
			const swapIndex = this.nextInt(0, index)
			const value = result[index]
			result[index] = result[swapIndex] as T
			result[swapIndex] = value as T
		}
		return result
	}
}

function hashSeed(seed: number | string): number {
	if (typeof seed === 'number' && Number.isFinite(seed)) {
		return (seed | 0) || 0x6d2b79f5
	}

	let hash = 0x811c9dc5
	for (const character of String(seed)) {
		hash ^= character.charCodeAt(0)
		hash = Math.imul(hash, 0x01000193)
	}
	return hash || 0x6d2b79f5
}

