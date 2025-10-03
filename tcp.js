const net = require('net');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Enable input from terminal
const readline = require('readline');


let chunks = [];
let currrentIndex = -1;
let isStopped = false;
// let lawFilePath = 'lawfiles/20241217 AIC v Shapoorji.law'; //test 2.law
// let lawFilePath = 'cmds.txt'; //test 2.law
let lawFilePath = 'commands.json';// 'cmd.json'; //test 2.law
// let lawFilePath = 'commands_10-6-25.json'; // 'cmd.json';// 'cmd.json'; //test 2.law
let delayMs = 400;
let isJson = false;
let refreshCount = 0;
let isByPassRefresh = false;
let isOnHold = false;
let moveToNext = false;

function readAllChunks() {
  if (lawFilePath.split('.').pop().toLowerCase() == 'law') {
    lawToHex();
  } else if (lawFilePath.split('.').pop().toLowerCase() == 'json') {
    jsonToHex();
  } else {
    chunks = txtTohex();
    console.log('File read successfully', chunks.length);
  }
}

function jsonToHex() {
  fs.readFile(lawFilePath, async (err, data) => {
    if (err) {
      console.error('Error reading file:', err);
      return;
    }
    isJson = true;

    const finalData = JSON.parse(data.toString('utf-8'));

    // finalData.filter(m=>!m.cmdType).map(a=>  stringToAsciiHex(a.data1)  )
    // chunks = finalData.map(a=>( !m.cmdType ? stringToAsciiHex(a.data1) : a.hexCmd  ));
    chunks = finalData.map(a => {
      return { hex: !a.cmdType ? stringToAsciiHex(a.data1) : a.hexCmd, cmdType: a.cmdType };
    });

    console.log('data length', chunks.length)
  });
}

function lawToHex() {

  fs.readFile(lawFilePath, async (err, data) => {
    if (err) {
      console.error('Error reading file:', err);
      return;
    }

    console.log('data length', data.length)
    let currentGroup = '';


    for (let i = 0; i < data.length; i++) {
      const byte = data[i].toString(16).padStart(2, '0'); // Convert byte to hex string
      currentGroup += byte;

      // If we have 16 characters (8 hex values), push to chunks
      if (currentGroup.length === 40) {
        chunks.push(currentGroup);
        currentGroup = ''; // Reset the group
      }
    }

    // Push the remaining group if there are leftover bytes
    if (currentGroup.length > 0) {
      chunks.push(currentGroup);
    }

    console.log('Grouped chunks:', chunks);

    console.log('File read successfully', data.length);

  });
}



function txtTohex() {

  // Read the file

  const filePath = path.join(__dirname, lawFilePath);
  const fileContent = fs.readFileSync(filePath, 'utf-8');

  // Step 1: Convert lines into a continuous array of hex bytes
  const hexBytes = fileContent
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .flatMap(line => line.match(/.{1,2}/g)); // Split every 2 characters

  // Step 2: Group every 40 bytes and join into a string
  const batchSize = 20;
  const hexBatchStrings = [];

  for (let i = 0; i < hexBytes.length; i += batchSize) {
    const batch = hexBytes.slice(i, i + batchSize).join('');
    hexBatchStrings.push(batch);
  }
  // console.log('Hex Byte Array:', hexBatchStrings);
  return hexBatchStrings;
}

function stringToAsciiHex(str) {
  return str
    .split('')
    // .map(char => char.charCodeAt(0).toString(16)) // toString(16) converts to hex
    .map(char => char.charCodeAt(0).toString(16).padStart(2, '0')) // 2-digit hex
    .join('');
}

// Create a readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: 'COMMAND> '
});

// Display the prompt
rl.prompt();

// Handle user input
rl.on('line', (line) => {
  debugger;
  const input = line.trim();
  if (!socketR) {
    console.log('No TCP Client connected');
    return;
  }


  console.log('Commande received', input);

  if (isOnHold) {
    if (input.toLowerCase() == 'all') {
      isByPassRefresh = true;
    }
    moveToNext = true;
    emitData();



    return;
  }

  try {
    if (input.includes('setms=')) {
      delayMs = parseInt(input.replace('setms=', '')) || 400
    }
  } catch (error) {
    console.error(error);
  }
  switch (input) {
    case 's':
      currrentIndex++;
      isStopped = false;
      emitData();
      break;
    case 'e':
      isStopped = true;
      currrentIndex = -1;
      break;
    case 'b':
      isStopped = true;
      break;
    case 'n':
      currrentIndex++;

      sendCommand();
      break;
    case 'p':
      currrentIndex--;

      sendCommand();
      break;
    case 'c':
      console.clear();

      break;
    case 'r':
      sendCommand();

      break;
    default:

      console.log(`Unknown command: ${input}`);
      break;
  }

  rl.prompt();
}).on('close', () => {
  console.log('Exiting the CLI.');
  process.exit(0);
});

var socketR;
const tcpServer = net.createServer((socket) => {
  console.log('TCP Client connected');
  socketR = socket;


  socketR.on('end', () => {
    console.log('TCP Client disconnected');
  });

  socketR.on('error', (err) => {
    console.error('Socket error:', err);
  });
});

tcpServer.listen(1337, '127.0.0.1', () => {
  console.log('TCP Server listening on port 1337');
});



// Create an HTTP server for the API endpoint
const httpServer = http.createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/data') {
    // Return the desired JSON response
    res.writeHead(200, { 'Content-Type': 'application/json' });
    if (socketR) {

      socketR.end(); // Close the connection after streaming the file
    } else {
      console.log('No TCP Client connected');
    }

    res.end(JSON.stringify({ msg: 1 }));
  } else {
    // Handle 404 Not Found for other routes
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

// Start the HTTP server on the same port
httpServer.listen(8081, '127.0.0.1', () => {
  console.log('HTTP Server listening on port 8081');
});



function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}


async function emitData() {
  // socketR.write(chunks);
  // return;

  isOnHold = false;
  for (let i = currrentIndex; i < chunks.length; i++) {
    currrentIndex = i;
    if (i >= 0) {

      if (!isByPassRefresh && isJson) {
        if (chunks[i].cmdType == 'R' && !moveToNext) {
          isOnHold = true;
          refreshCount++;
          console.warn(`Found refresh command ${refreshCount}, want to continue? (y/all (for by pass all refresh hold)) default(y)`);
          break;
        }

        moveToNext = false;

      }

      const hx = isJson ? chunks[i].hex : chunks[i];
      const chunk = Buffer.from(hx, 'hex');// Buffer.from([chunks[i]]); // = chunks[i].toString('hex');
      console.log(currrentIndex, 'Sending chunk:', chunk, '/', chunks.length);
      socketR.write(chunk);
      await delay(delayMs); // Delay of 200ms
      if (isStopped) {
        isStopped = false;
        break;
      }
    }
  }
}

function sendCommand() {
  try {
    const hx = isJson ? chunks[currrentIndex].hex : chunks[currrentIndex];
    const chunk = Buffer.from(hx, 'hex');;
    console.log(currrentIndex, 'Sending chunk:', chunk);
    socketR.write(chunk);
  } catch (error) {

  }
}







readAllChunks();

