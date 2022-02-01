# wayback-machine-scraper

## Introduction
Scrapes the [Wayback Machine](https://web.archive.org) and downloads the HTML "snapshots" over a time period so they can be displayed locally.

## Usage  

**Prerequisites:**
1. Node.js
2. Internet connectivity

**Steps:**
1. Clone the repository and open it
2. Add the dates that you wish to scrape for in `YYYYMMDD` format as a JSON array in `dates.json`. The program expects days to be sequential. I used [this](https://catonmat.net/tools/generate-calendar-dates) website.
3. `npm i` to install the dependencies (just axios)
4. Set configuration by either editing the `config` object, or using the CLI
5. Run the program with `node scraper`

### CLI

- `--website`: the website to scrape (include http(s)://), default: none
- `--wait-length`: amount of days in between attempts, default: 10
- `--decrement`: days to decrement by when there is a failed list request, default: 1
- `--tick-duration`: milliseconds spent on each day, default: 100

**Examples**
```
node scraper --website=http://www.youtube.com
```
```
node scraper --website=http://www.facebook.com --wait-length=30 --decrement=5 --tick-duration=50
```

## Discussion

The goal is to get a sample of the wayback machine’s archives and for a particular website and download the HTML pages. The Wayback Machine has pages for every timestamp it was archived. We want to download each page’s HTML so we can display it. 

The Wayback Machine API is not the much help. The main query is to get the most recent sample, other dates can only be returned if the correct timestamp is supplied.

### Getting a sample of correct timestamps

The internal endpoint:

```
https://web.archive.org/__wb/calendarcaptures/2?url=<...>&date=<...>
```

returns (for example):

```json
{
  "colls":[["20thcenturyweb","alexa_title","alexacrawls"],["inaweb"],["alexa_to","alexacrawls"]],
  "items":[[32727,200,1],[102024,200,2]]
}
```

Or an empty JSON `{}` if the timestamp supplied for `date` in the endpoint is invalid. I’m pretty sure `colls` is data about who crawled the website. The first element of each `items` array is the rest of the timestamp needed to get correct timestamps for querying the actual HTML pages. The second item is likely the HTTP response code that the crawler got. 

### Program structure  

The program hits the first endpoint to search for full timestamps which it can request the full HTML page from, and then uses the timestamps to make the second request. CSS and images inside the downloaded pages will hopefully display in-broswer because the program has converted relative links into absolute `web.archive.org` links.



