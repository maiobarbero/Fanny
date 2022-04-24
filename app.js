require('dotenv').config()

const express = require('express')
const errorHandlers = require('errorhandler')
const bodyParser = require('body-parser')
const methodOverride = require('method-override')
const logger = require('morgan')
const app = express()
const path = require('path')
const port = 3000

app.use(logger('dev'))
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))
app.use(methodOverride())
app.use(errorHandlers())
app.use(express.static(path.join(__dirname, 'public')))

const Prismic = require('@prismicio/client')
const PrismicDOM = require('prismic-dom')

function initApi(req) {
  return Prismic.getApi(process.env.PRISMIC_ENDPOINT, {
    accessToken: process.env.PRISMIC_ACCESS_TOKEN,
    req: req,
  })
}

// Link Resolver
const handleLinkResolver = (doc) => {
  if (doc.type === 'product') {
    return '/detail/' + doc.slug
  }
  if (doc.type === 'about') {
    return '/about'
  }
  if (doc.type === 'collections') {
    return '/collections'
  }

  return '/'
}

// Middleware to inject prismic context
app.use((req, res, next) => {
  res.locals.Link = handleLinkResolver

  res.locals.Numbers = (index) => {
    return index == 0
      ? 'One'
      : index == 1
      ? 'Two'
      : index == 2
      ? 'Three'
      : index == 4
      ? 'Four'
      : ''
  }

  res.locals.PrismicDOM = PrismicDOM

  next()
})

app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'pug')

const handleRquest = async (api) => {
  const preloader = await api.getSingle('preloader')
  const navigation = await api.getSingle('navigation')
  const meta = await api.getSingle('meta')

  return {
    meta,
    navigation,
    preloader,
  }
}
app.get('/', async (req, res) => {
  const api = await initApi(req)
  const defaults = await handleRquest(api)
  const home = await api.getSingle('home')

  const { results: collections } = await api.query(
    Prismic.Predicates.at('document.type', 'colelction'),
    {
      fetchLinks: 'product.image',
    }
  )
  res.render('pages/home', {
    ...defaults,
    collections,
    home,
  })
})

app.get('/about', async (req, res) => {
  const api = await initApi(req)
  const about = await api.getSingle('about')
  const defaults = await handleRquest(api)

  res.render('pages/about', {
    ...defaults,
    about,
  })
})

app.get('/collections', async (req, res) => {
  const api = await initApi(req)
  const home = await api.getSingle('home')
  const defaults = await handleRquest(api)

  const { results: collections } = await api.query(
    Prismic.Predicates.at('document.type', 'colelction'),
    {
      fetchLinks: 'product.image',
    }
  )
  res.render('pages/collections', {
    ...defaults,
    collections,
    home,
  })
})

app.get('/detail/:uid', async (req, res) => {
  const api = await initApi(req)
  const defaults = await handleRquest(api)

  const product = await api.getByUID('product', req.params.uid, {
    fetchLinks: 'colelction.title',
  })
  res.render('pages/detail', {
    ...defaults,
    product,
  })
})

app.listen(port)
