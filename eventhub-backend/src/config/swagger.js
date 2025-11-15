// File: src/config/swagger.js
const pkg = require('../../package.json');

// Definizione manuale dello schema OpenAPI principale
const swaggerSpec = {
  openapi: '3.0.3',
  info: {
    title: 'EventHub API',
    description: 'API REST per gestione eventi, autenticazione JWT, pannello admin e funzionalità real-time.',
    version: pkg.version || '1.0.0'
  },
  servers: [
    { url: 'http://localhost:3000/api', description: 'Sviluppo locale' }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    },
    schemas: {
      UserLogin: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 6 }
        }
      },
      UserRegister: {
        type: 'object',
        required: ['username', 'email', 'password'],
        properties: {
          username: { type: 'string' },
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 6 }
        }
      },
      EventCreate: {
        type: 'object',
        required: ['title', 'description', 'date', 'location', 'capacity', 'category_id'],
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          date: { type: 'string', format: 'date-time' },
          location: { type: 'string' },
          capacity: { type: 'integer', minimum: 1 },
          category_id: { type: 'integer' },
          min_participants: { type: 'integer', nullable: true },
          max_participants: { type: 'integer', nullable: true }
        }
      }
    }
  },
  security: [{ bearerAuth: [] }],
  paths: {
    '/health': {
      get: {
        summary: 'Stato API',
        tags: ['System'],
        responses: {
          '200': { description: 'API funzionante' }
        },
        security: []
      }
    },
    '/users/register': {
      post: {
        summary: 'Registrazione utente',
        tags: ['Auth'],
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/UserRegister' } }
          }
        },
        responses: {
          '201': { description: 'Utente registrato' },
          '409': { description: 'Username o email già in uso' },
          '400': { description: 'Dati non validi' }
        },
        security: []
      }
    },
    '/users/login': {
      post: {
        summary: 'Login utente',
        tags: ['Auth'],
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/UserLogin' } }
          }
        },
        responses: {
          '200': { description: 'Login OK, restituisce JWT' },
          '401': { description: 'Credenziali non valide' },
          '404': { description: 'Utente non trovato' }
        },
        security: []
      }
    },
    '/events': {
      get: {
        summary: 'Lista eventi pubblici con filtri',
        tags: ['Events'],
        parameters: [
          { name: 'category_id', in: 'query', schema: { type: 'integer' } },
          { name: 'location', in: 'query', schema: { type: 'string' } },
          { name: 'date', in: 'query', schema: { type: 'string', format: 'date' } }
        ],
        responses: { '200': { description: 'Lista eventi' } },
        security: []
      },
      post: {
        summary: 'Crea un nuovo evento (pending approval)',
        tags: ['Events'],
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/EventCreate' } },
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  description: { type: 'string' },
                  date: { type: 'string', format: 'date-time' },
                  location: { type: 'string' },
                  capacity: { type: 'integer' },
                  category_id: { type: 'integer' },
                  min_participants: { type: 'integer' },
                  max_participants: { type: 'integer' },
                  photos: { type: 'array', items: { type: 'string', format: 'binary' } }
                },
                required: ['title','description','date','location','capacity','category_id']
              }
            }
          }
        },
        responses: { '201': { description: 'Evento creato' }, '400': { description: 'Dati non validi' }, '403': { description: 'Email non verificata o privilegi insufficienti' } }
      }
    },
    '/events/{id}': {
      patch: {
        summary: 'Modifica evento (owner)',
        tags: ['Events'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { '200': { description: 'Evento aggiornato' }, '403': { description: 'Non autorizzato' }, '404': { description: 'Non trovato' } }
      },
      delete: {
        summary: 'Cancella evento (owner)',
        tags: ['Events'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { '204': { description: 'Cancellato' }, '403': { description: 'Non autorizzato' }, '404': { description: 'Non trovato' } }
      }
    },
    '/events/{id}/register': {
      post: {
        summary: 'Iscrizione all’evento',
        tags: ['Events'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { '201': { description: 'Iscritto' }, '409': { description: 'Già iscritto' }, '400': { description: 'Evento pieno' }, '404': { description: 'Evento non valido' }, '403': { description: 'Email non verificata o account bloccato' } }
      },
      delete: {
        summary: 'Annulla iscrizione',
        tags: ['Events'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { '200': { description: 'Iscrizione annullata' }, '404': { description: 'Iscrizione non trovata' }, '403': { description: 'Email non verificata o account bloccato' } }
      }
    },
    '/admin/events/pending': {
      get: {
        summary: 'Eventi in attesa di approvazione',
        tags: ['Admin'],
        responses: { '200': { description: 'Lista pending' }, '403': { description: 'Privilegi admin richiesti' } }
      }
    },
    '/admin/events/{id}/approve': {
      patch: {
        summary: 'Approva o rifiuta evento',
        tags: ['Admin'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', properties: { isApproved: { type: 'boolean' } }, required: ['isApproved'] } } }
        },
        responses: { '200': { description: 'Aggiornato' }, '404': { description: 'Non trovato' }, '403': { description: 'Privilegi admin richiesti' } }
      }
    },
    '/admin/users': {
      get: {
        summary: 'Lista utenti',
        tags: ['Admin'],
        responses: { '200': { description: 'Lista utenti' }, '403': { description: 'Privilegi admin richiesti' } }
      }
    },
    '/admin/users/{id}/block': {
      patch: {
        summary: 'Blocca/Sblocca utente',
        tags: ['Admin'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', properties: { isBlocked: { type: 'boolean' } }, required: ['isBlocked'] } } }
        },
        responses: { '200': { description: 'Aggiornato' }, '404': { description: 'Non trovato' }, '403': { description: 'Privilegi admin richiesti' } }
      }
    },
    '/users/me/events': {
      get: {
        summary: 'Eventi creati dall’utente autenticato',
        tags: ['Users'],
        responses: { '200': { description: 'Lista eventi creati' }, '401': { description: 'Non autenticato' } }
      }
    },
    '/users/me/registrations': {
      get: {
        summary: 'Eventi a cui l’utente autenticato è iscritto',
        tags: ['Users'],
        responses: { '200': { description: 'Lista eventi iscritti' }, '401': { description: 'Non autenticato' } }
      }
    }
  }
};

module.exports = { swaggerSpec };