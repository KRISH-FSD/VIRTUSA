from extensions import db
from datetime import datetime, timedelta
import uuid
import os


class IDPhoto(db.Model):
    """
    Stores College ID card photos captured during pre-exam identity verification.

    Privacy & Data Retention Policy:
      - Photos are stored encrypted on the filesystem under secure_photos/
      - Each photo expires exactly 24 hours after capture (expires_at)
      - On every new upload for a user, all previous photos for that user
        are securely wiped (file overwritten with zeros then deleted)
      - The cleanup_expired() classmethod is called on every upload to
        purge any globally expired records
    """
    __tablename__ = 'id_photos'

    id          = db.Column(db.String(36), primary_key=True)
    user_id     = db.Column(db.String(64), nullable=False, index=True)
    attempt_id  = db.Column(db.Integer, nullable=True)
    file_path   = db.Column(db.String(512), nullable=False)
    captured_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    expires_at  = db.Column(db.DateTime, nullable=False)

    def __init__(self, user_id, file_path, attempt_id=None):
        self.id         = str(uuid.uuid4())
        self.user_id    = user_id.strip().upper()
        self.attempt_id = attempt_id
        self.file_path  = file_path
        self.captured_at = datetime.utcnow()
        self.expires_at  = self.captured_at + timedelta(hours=24)

    @property
    def is_expired(self):
        return datetime.utcnow() > self.expires_at

    def secure_delete_file(self):
        """
        Securely wipe the photo file:
        1. Overwrite every byte with zeros (prevents forensic recovery).
        2. Delete the file from disk.
        """
        try:
            path = self.file_path
            if path and os.path.exists(path):
                size = os.path.getsize(path)
                if size > 0:
                    with open(path, 'r+b') as f:
                        f.write(b'\x00' * size)
                        f.flush()
                        os.fsync(f.fileno())
                os.remove(path)
        except Exception:
            # Best-effort: try plain delete as fallback
            try:
                if self.file_path and os.path.exists(self.file_path):
                    os.remove(self.file_path)
            except Exception:
                pass

    @classmethod
    def cleanup_expired(cls):
        """Delete all expired ID photo records and their files from disk."""
        expired = cls.query.filter(cls.expires_at < datetime.utcnow()).all()
        for photo in expired:
            photo.secure_delete_file()
            db.session.delete(photo)
        if expired:
            db.session.commit()

    @classmethod
    def delete_all_for_user(cls, user_id):
        """
        Permanently and securely delete all photos for a given user.
        Called before saving a new photo (retake scenario).
        """
        photos = cls.query.filter_by(user_id=user_id.strip().upper()).all()
        for photo in photos:
            photo.secure_delete_file()
            db.session.delete(photo)
        if photos:
            db.session.commit()

    def to_dict(self):
        return {
            'id':          self.id,
            'user_id':     self.user_id,
            'attempt_id':  self.attempt_id,
            'captured_at': self.captured_at.isoformat(),
            'expires_at':  self.expires_at.isoformat(),
        }
