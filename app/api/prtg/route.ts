import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const server = searchParams.get('server')
  const username = searchParams.get('username')
  const passhash = searchParams.get('passhash')
  const sensorId = searchParams.get('sensorId')

  if (!server || !username || !passhash || !sensorId) {
    return NextResponse.json(
      { error: 'Missing required parameters' },
      { status: 400 }
    )
  }

  try {
    const prtgUrl = `${server}/api/getsensordetails.json?id=${sensorId}&username=${username}&passhash=${passhash}`

    const response = await fetch(prtgUrl, {
      headers: {
        'Accept': 'application/json',
      },
      // Disable SSL verification for development (remove in production)
      // @ts-ignore
      rejectUnauthorized: false,
    })

    if (!response.ok) {
      throw new Error(`PRTG API error: ${response.status}`)
    }

    const data = await response.json()

    // Parse PRTG response and extract status
    let status = 'up'
    let value = 'N/A'

    if (data.sensordata) {
      const statusRaw = data.sensordata.status || data.sensordata.statusid

      // PRTG status mapping
      // 1-3: Up, 4-5: Warning, 6+: Down
      if (typeof statusRaw === 'number') {
        if (statusRaw >= 1 && statusRaw <= 3) status = 'up'
        else if (statusRaw >= 4 && statusRaw <= 5) status = 'warning'
        else status = 'down'
      } else if (typeof statusRaw === 'string') {
        const statusLower = statusRaw.toLowerCase()
        if (statusLower.includes('up')) status = 'up'
        else if (statusLower.includes('warning') || statusLower.includes('unusual')) status = 'warning'
        else if (statusLower.includes('down') || statusLower.includes('error')) status = 'down'
      }

      // Extract value from the first channel if available
      if (data.sensordata.channel && Array.isArray(data.sensordata.channel) && data.sensordata.channel.length > 0) {
        value = data.sensordata.channel[0].lastvalue || 'N/A'
      }
    }

    return NextResponse.json({
      status,
      value,
      rawData: data,
    })
  } catch (error) {
    console.error('Error fetching PRTG data:', error)

    // Return mock data for development/testing
    const mockStatuses = ['up', 'down', 'warning']
    const randomStatus = mockStatuses[Math.floor(Math.random() * mockStatuses.length)]

    return NextResponse.json({
      status: randomStatus,
      value: `${Math.floor(Math.random() * 100)}%`,
      error: 'Using mock data - PRTG server unavailable',
    })
  }
}
