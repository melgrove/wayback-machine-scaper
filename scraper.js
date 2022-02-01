/*
    Configuration

    Either set one of the config variables manually in the object below
    or pass it on the command line as an argument. If a required variable
    is set to null below, it must be passed via the CLI.
*/
const config = {
    website: null,
    waitLength: 10,
    decrement: 1,
    tickDuration: 100
}

// CLI
process.argv.slice(2).forEach(arg => {
    if(/--website=.*/.test(arg)) {
        config.website = arg.split('--website=')[1];
    } else if(/--wait-length=.*/.test(arg)) {
        const parsed = parseInt(arg.split('--wait-length=')[1]);
        if(isNaN(parsed)) throw Error('Wait length must be an integer');
        config.waitLength = parsed;
    } else if(/--decrement=.*/.test(arg)) {
        const parsed = parseInt(arg.split('--decrement=')[1]);
        if(isNaN(parsed)) throw Error('Decrement must be an integer');
        config.decrement = parsed;
    } else if(/--tick-duration=.*/.test(arg)) {
        const parsed = parseInt(arg.split('--tick-duration=')[1])
        if(isNaN(parsed)) throw Error('Tick duration must be an integer');
        config.tickDuration = parsed;
    } else {
        throw Error('Invalid CLI argument. Valid are: --website=..., --wait-length=..., decrement=..., tick-duration=...');
    }
})

if(config.website === null) throw Error('Website must be set in the config object or passed as an argument');

const listEndpoint = `https://web.archive.org/__wb/calendarcaptures/2?url=${config.website}&date=`
const pageEndpoint = 'https://web.archive.org/web/'

const fs = require('fs');
const axios = require('axios')
let dates = fs.readFileSync('dates.json')
dates = JSON.parse(dates);
let successfulFileWrites = 0;

// Polyfill for replaceAll()
if (!String.prototype.replaceAll) {
	String.prototype.replaceAll = function(str, newStr){
		// If a regex pattern
		if (Object.prototype.toString.call(str).toLowerCase() === '[object regexp]') {
			return this.replace(str, newStr);
		}
		// If a string
		return this.replace(new RegExp(str, 'g'), newStr);
	};
}

crawler()

async function crawler() {
  console.log('crawler started')
  let { waitLength, decrement, tickDuration } = config;
  let daysSinceLastImage = 0;
  
  for(let day of dates) {
    console.log('Iteration on day: ' + day + '. Successful file write: ' + successfulFileWrites)
    if(daysSinceLastImage > waitLength) {
      let res = await queryList(day);
      // query listEndopint
      if(res === null || Object.keys(res).length == 0) {
        if(waitLength > 0) waitLength = waitLength - decrement < 0 ? 0 : waitLength - decrement;
        daysSinceLastImage = 0
      } else {
        let time;
        for(let row of res) {
          if(row[1] === 200) {
            time = row[0];
            break;
          }
        }
        console.log('LIST HIT: time: ' + time + ' date: ' + day)
        if(time) {
          // save page
          queryPage(String(day) + String(time))
          // reset
          waitLength = config.waitLength;
          daysSinceLastImage = 0
        } else {
          if(waitLength > 0)  waitLength = waitLength - decrement < 0 ? 0 : waitLength - decrement;
          daysSinceLastImage = 0
        }
      }
    } 
    else {
      daysSinceLastImage++;
    }
    await new Promise(r => setTimeout(r, tickDuration));
  }
  console.log('crawler finished')
}
   
async function queryList(date) {
  console.log('requesting list endpoint: ' + listEndpoint + date);
  try {
    let res = await axios.get(listEndpoint + date)
    try {
      if(res.data.items) return res.data.items;
      else throw Error();
    } catch(err) {
      console.log('response body is not valid JSON!')
      return null;
    }
  } catch(err) {
      // console.log(err)
      return null
  };
}

function queryPage(time) {
  console.log('requesting page endpoint: ' + pageEndpoint + time + '/' + config.website);
  axios.get(pageEndpoint + time + '/' + config.website)
    .then(response => {
        let fileName
        try {
          fileName = 'pageData/' + time + '.html'
          let parsedHTML = response.data.split(/<!-- [BEGIN,END]]n.*?INSERT -->/);
          parsedHTML = parsedHTML[0] + parsedHTML[2];
          console.log(typeof parsedHTML)
          // add references for img
          parsedHTML = parsedHTML.replaceAll('src="/web/', 'src="https://web.archive.org/web/')
          // add references for css
          parsedHTML = parsedHTML.replaceAll(/rel="stylesheet" type="text\/css" href="\/_static/, 'rel="stylesheet" type="text/css href="https://web.archive.org/_static/')
          // this is a hack lol
          parsedHTML = parsedHTML.replaceAll('undefined', '')
          console.log('HTML: ' + parsedHTML.slice(0, 50) + ' ...')
          fs.writeFileSync(fileName, parsedHTML)
          console.log('Successfully wrote ' + fileName)
          successfulFileWrites++;
        } catch(err) {
          console.log(err)
          console.log('Error writing file ' + fileName)
        }
      })
    .catch(err => {
      console.log('HTML request error: ' + err)
      const fileName = 'pageData/' + time + 'error.txt'
      fs.writeFileSync(fileName, err.response.status + '\n' + time)
      console.log('Error, wrote ' + fileName)
    })
}
