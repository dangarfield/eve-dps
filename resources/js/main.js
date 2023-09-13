const sleep = (ms) => {return new Promise(resolve => setTimeout(resolve, ms))}

let currentDataItems = []

const convertStringToInt = (inputString) => {
    if (/^\d+$/.test(inputString)) {
      return parseInt(inputString, 10)
    } else {
      return 0
    }
  }

  
const processLine = (line) => {
    const lineSplit = line.split(' ')
    if(!line.includes('(combat)')) return null
    if(line.includes('misses')) return null

    const regexPattern = /<b>(.*?)<\/b>/g
    const matches = line.match(regexPattern)
    if (matches === null) return null

    
    const matchedData = matches.map((match) => match.replace(/<\/?b>/g, ''))
    const dmg = convertStringToInt(matchedData[0])
    const ship = matchedData[1].replace('<color=0xffffffff>','')
    
    
    let isMe = false
    if(line.includes('(combat) <color=0xff00ffff')) {
        isMe = true
    }
    const time = Date.parse(line.substring(2,21).replace(/\./g,'-').replace(' ','T')+ '+0000' )
    console.log(time, ship, dmg, isMe)

    const data = {time, ship, dmg, isMe}
    currentDataItems.push(data)
    // console.log('processLine', line, data)//, new Date(time), new Date())
}
const dpsOutEle = document.querySelector('.dps-out')
const dpsInEle = document.querySelector('.dps-in')

const calculateDPS = async (seconds) => {
    const now = new Date().getTime()
    currentDataItems = currentDataItems.filter(d => d.time >= now - (seconds * 1000))

    const dps = {
        out: 0,
        in: 0
    }

    for (const d of currentDataItems) {
        // console.log('d is valid', d.time < new Date(now))
        if(d.time < new Date(now)) {
            if(d.isMe) {
                dps.out += (d.dmg/seconds)
            } else {
                dps.in += (d.dmg/seconds)
            }
        }
    }
    console.log('dps', dps)
    // dps.out = Math.floor(Math.random() * 100)
    // dps.in = Math.floor(Math.random() * 100)
    dpsOutEle.textContent = Math.round(dps.out)
    dpsInEle.textContent = Math.round(dps.in)
    updateDataGraph(Math.round(dps.out), Math.round(dps.in))
}
let dpsChart
const graphData = {
    out: new Array(40).fill(0),
    in: new Array(40).fill(0)
}
const updateDataGraph = (dpsOut, dpsIn) => {
    // graphData.out.push(dpsOut)
    graphData.out.shift()
    // graphData.in.push(dpsIn)
    graphData.in.shift()
    
    // dpsChart.updateSeries([{
    //     data: graphData.out
    //   },{
    //     data: graphData.in
    //   }], false)
      dpsChart.appendData([{
        data: [dpsOut]
      }, {
        data: [dpsIn]
      }], false)
    
      
}
const initDPSChart = () => {
    var options = {
        chart: {
          type: 'line',
          toolbar: {
            show:false
            },
            zoom: {enabled: false},
            animations: {enabled:false},
            parentHeightOffset: 0,

        },
        stroke: {
            curve: 'smooth',
            width: 2
          }
        ,          
        series: [{
            name: 'Out',
            data: graphData.out,
            color: '#59a7bf'
          },{
            name: 'In',
            data: graphData.in,
            color: '#ce3331'
          }],
        yaxis: {
            type: 'numeric',
            opposite: true,
            labels: {
                align: 'left',
                style: {
                    colors: ['white']
                }
            },
            axisTicks: {
                show: false
            },
            axisBorder: {
                show: false
            },
            forceNiceScale: true
        },
        xaxis: {
            labels: {show: false},
            axisTicks: {show:false},
            axisBorder: {show:false}
        },
        legend: {
            show: false
        },
        grid: {
            show: false,
            padding: { left: -10, right: 0, top: -20, bottom: -5 }
        },
        dataLabels: {enabled: false},
        tooltip: {enabled: false},
        sparkline: {
            enabled: true
          }
      
      }
      
    dpsChart = new ApexCharts(document.querySelector(".dps-chart"), options);
      
    dpsChart.render();
}
const processGameLogs = async (logDir) => {
    let processedLineNo = 0
    while(true) {
        let entries = await Neutralino.filesystem.readDirectory(logDir);
        entries = entries.filter(e => e.type==="FILE" && e.entry.replace(/\d+/g,'') === '__.txt')
        entries = entries.sort((a,b) => b.entry.localeCompare(a.entry))
        if(entries.length === 0) {
            window.alert('ERROR')
        }
        const logFile = `${logDir}/${entries[0].entry}`
        const lines = (await Neutralino.filesystem.readFile(logFile)).split('\n')
        for (let lineNo = 0; lineNo < lines.length; lineNo++) {
            if(processedLineNo <= lineNo) {
                const line = lines[lineNo];
                processLine(line)
                processedLineNo = lineNo
            }
        }
        await sleep(100)
    }
}
const getLogDir = async () => {
    let osInfo = await Neutralino.computer.getOSInfo();
    console.log('osInfo', osInfo)
    let homeDir
    let pathSep = '/'
    if (osInfo.name === 'Darwin') {
        console.log('MAC')
        homeDir = await Neutralino.os.getEnv('HOME')
    } else if (osInfo.name.toLowerCase().includes('win')) {
        console.log('WIN')
        homeDir = await Neutralino.os.getEnv('HOMEPATH')
        pathSep = '\\'
    }
    return [homeDir,'Documents','EVE','logs','Gamelogs'].join(pathSep)
}
const init = async () => {
    

    try {
        const logDir = await getLogDir()
        console.log('logDir', logDir)
        initDPSChart()
        const seconds = 10
        const perSecond = 4
        setInterval(() => {calculateDPS(seconds)}, 1000 / perSecond)
        await processGameLogs(logDir)
    } catch (error) {
        console.log('error', error)
    }
    

}

function setTray() {
    if(NL_MODE != "window") {
        console.log("INFO: Tray menu is only available in the window mode.");
        return;
    }
    let tray = {
        icon: "/resources/icons/trayIcon.png",
        menuItems: [
            {id: "VERSION", text: "Get version"},
            {id: "SEP", text: "-"},
            {id: "QUIT", text: "Quit"}
        ]
    };
    Neutralino.os.setTray(tray);
}

function onTrayMenuItemClicked(event) {
    switch(event.detail.id) {
        case "VERSION":
            Neutralino.os.showMessageBox("Version information",
                `Neutralinojs server: v${NL_VERSION} | Neutralinojs client: v${NL_CVERSION}`);
            break;
        case "QUIT":
            Neutralino.app.exit();
            break;
    }
}

function onWindowClose() {
    Neutralino.app.exit();
}

Neutralino.init();

Neutralino.events.on("trayMenuItemClicked", onTrayMenuItemClicked);
Neutralino.events.on("windowClose", onWindowClose);

if(NL_OS != "Darwin") { // TODO: Fix https://github.com/neutralinojs/neutralinojs/issues/615
    setTray();
}


init()