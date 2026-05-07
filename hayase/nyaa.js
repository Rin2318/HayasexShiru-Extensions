export default new class Nyaa {
  url = 'nyaaapi.onrender.com'

  async single ({ titles, episode }) {
    if (!titles?.length) return []
    return this.search(titles[0], episode)
  }

  batch = this.single
  movie = this.single

  async search (title, episode) {
    let query = title.replace(/[^\w\s-]/g, ' ').replace(/\s+/g, ' ').trim()
    if (episode) query += ` ${episode.toString().padStart(2, '0')}`

    const res = await fetch(`${this.url}/?page=rss&q=${encodeURIComponent(query)}&c=1_2&f=0`)
    if (!res.ok) return []
    const xml = await res.text()

    const get = (block, tag) => {
      const m = block.match(new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`))
      return m ? m[1].trim() : ''
    }

    const parseSize = s => {
      const m = s.match(/^([\d.]+)\s*([KMGT]i?B)/i)
      if (!m) return 0
      const units = { B: 1, KB: 1e3, MB: 1e6, GB: 1e9, TB: 1e12, KiB: 1024, MiB: 1024 ** 2, GiB: 1024 ** 3, TiB: 1024 ** 4 }
      return Math.round(parseFloat(m[1]) * (units[m[2]] || 1))
    }

    const trackers = [
      'http://nyaa.tracker.wf:7777/announce',
      'udp://open.stealth.si:80/announce',
      'udp://tracker.opentrackr.org:1337/announce',
      'udp://exodus.desync.com:6969/announce',
      'udp://tracker.torrent.eu.org:451/announce'
    ]

    const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(m => m[1])

    return items.map(block => {
      const hash = get(block, 'nyaa:infoHash').toLowerCase()
      if (!hash) return null
      const name = get(block, 'title')
      const trackerParams = trackers.map(t => `&tr=${encodeURIComponent(t)}`).join('')
      return {
        title: name,
        link: `magnet:?xt=urn:btih:${hash}&dn=${encodeURIComponent(name)}${trackerParams}`,
        hash,
        seeders: Number(get(block, 'nyaa:seeders') || 0),
        leechers: Number(get(block, 'nyaa:leechers') || 0),
        downloads: Number(get(block, 'nyaa:downloads') || 0),
        size: parseSize(get(block, 'nyaa:size')),
        date: new Date(get(block, 'pubDate')),
        accuracy: 'medium',
        type: 'alt'
      }
    }).filter(Boolean)
  }

  async test () {
    const res = await fetch(`${this.url}/?page=rss&q=one+piece`)
    return res.ok
  }
}()
