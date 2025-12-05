const Feedback = require('../models/Feedback');

function toPromise(fn, ...args) {
  return new Promise((resolve, reject) => {
    if (typeof fn !== 'function') return reject(new Error('Not a function'));
    fn(...args, (err, result) => err ? reject(err) : resolve(result));
  });
}

module.exports = {
  // render feedback form
  form: (req, res) => {
    const messages = [...req.flash('error'), ...req.flash('success')];
    res.render('feedback', { user: req.session.user, messages });
  },

  // submit feedback
  submit: async (req, res) => {
    try {
      // accept alternate field names just in case the form was modified
      const title = (req.body.title || '').trim();
      const comment = (req.body.comment || '').trim();
      const rating = parseInt(req.body.rating || 5, 10) || 5;

      if (!title || !comment) {
        req.flash('error', 'Title and comment are required');
        return res.redirect('/feedback');
      }

      const userId = req.session.user?.id;
      if (!userId) {
        req.flash('error', 'You must be logged in');
        return res.redirect('/login');
      }

      await toPromise(Feedback.add, { userId, title, comment, rating });
      req.flash('success', 'Thank you! Feedback submitted successfully');
      return res.redirect('/shopping');
    } catch (err) {
      console.error('Feedback.submit error:', err);
      req.flash('error', 'Failed to submit feedback');
      return res.redirect('/feedback');
    }
  },

  // admin: list all feedback
  list: (req, res) => {
    Feedback.getAll((err, feedbacks) => {
      if (err) {
        req.flash('error', 'Failed to load feedback');
        return res.redirect('/');
      }
      const messages = [...req.flash('success'), ...req.flash('error')];
      return res.render('feedbackList', {
        feedbacks: feedbacks || [],
        user: req.session.user,
        messages
      });
    });
  },

  // admin: delete feedback
  delete: (req, res) => {
    const id = req.params.id;
    Feedback.delete(id, (err) => {
      if (err) {
        req.flash('error', 'Failed to delete feedback');
      } else {
        req.flash('success', 'Feedback deleted');
      }
      return res.redirect('/feedback/all');
    });
  }
};
