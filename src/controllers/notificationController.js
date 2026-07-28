const Notification = require('../models/notification.model');
const { asyncHandler, BadRequestError, NotFoundError, UnauthorizedError } = require('../errors/errorConfig');

const getAllNotification = asyncHandler(async (req, res) => {
    const { role } = req.user

    // ─── Admin Check ──────────────────────────
    if (role !== 'admin' && role !== 'superadmin') {
        throw new ForbiddenError(
            'Access denied. Only admin can access notifications'
        )
    }

    // ─── Saari Notifications Fetch karo ───────
    const notifications = await Notification.find()
        .select('-__v')
        .sort({ notification_time: -1 }) // ← Latest pehle

    // ─── Read + Unread Count ──────────────────
    const totalCount = notifications.length
    const unreadCount = notifications.filter(n => !n.is_read).length
    const readCount = notifications.filter(n => n.is_read).length

    if (!notifications.length) {
        return res.status(200).json({
            success: true,
            message: 'No notifications found',
            totalCount: 0,
            unreadCount: 0,
            readCount: 0,
            data: []
        })
    }

    res.status(200).json({
        success: true,
        message: 'Notifications fetched successfully',
        totalCount,
        unreadCount,
        readCount,
        data: notifications
    })
})

const seenNotification = asyncHandler(async (req, res) => {
    const { role } = req.user
    const { id } = req.params

    // ─── Admin Check ──────────────────────────
    if (role !== 'admin' && role !== 'superadmin') {
        throw new ForbiddenError(
            'Access denied. Only admin can update notifications'
        )
    }

    // ─── Notification Dhundo ──────────────────
    const notification = await Notification.findById(id)
    if (!notification) {
        throw new NotFoundError('Notification not found')
    }

    // ─── Already Read Hai? ────────────────────
    if (notification.is_read) {
        return res.status(200).json({
            success: true,
            message: 'Notification already marked as read',
            data: notification
        })
    }

    // ─── Mark as Read ─────────────────────────
    notification.is_read = true
    await notification.save()

    res.status(200).json({
        success: true,
        message: 'Notification marked as read',
        data: notification
    })
})


const removeNotification = asyncHandler(async (req, res) => {
    const { role } = req.user
    const { id } = req.params

    // ─── Admin Check ──────────────────────────
    if (role !== 'admin' && role !== 'superadmin') {
        throw new ForbiddenError(
            'Access denied. Only admin can remove notifications'
        )
    }

    // ─── Notification Dhundo ──────────────────
    const notification = await Notification.findById(id)
    if (!notification) {
        throw new NotFoundError('Notification not found')
    }

    // ─── Delete karo ──────────────────────────
    await Notification.findByIdAndDelete(id)

    res.status(200).json({
        success: true,
        message: 'Notification removed successfully'
    })
})

module.exports = { getAllNotification, seenNotification, removeNotification }