# RabbitMQ Configuration for Notes Application

# Management plugin enabled by default in rabbitmq:3-management image
# Access management UI at http://localhost:15672
# Default credentials: guest/guest (change in production)

# This directory contains RabbitMQ configuration
# The official rabbitmq:3-management image will be used
# No custom Dockerfile needed

# Environment variables for customization:
# RABBITMQ_DEFAULT_USER=admin
# RABBITMQ_DEFAULT_PASS=secure_password
# RABBITMQ_DEFAULT_VHOST=/

# Exchanges created by services:
# - notes_events (topic exchange, durable)

# Queues:
# - analytics_queue (bound to notes_events with pattern: note.*)

# Message Flow:
# 1. Notes Service publishes events to 'notes_events' exchange
# 2. Analytics Service consumes from 'analytics_queue'
# 3. Share Service publishes share-related events

# Event Types:
# - note.created
# - note.updated
# - note.deleted
# - note.favorite.toggled
# - note.pin.toggled
# - note.shared
# - note.viewed
# - note.share.revoked
