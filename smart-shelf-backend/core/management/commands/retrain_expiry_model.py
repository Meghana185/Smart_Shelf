from django.core.management.base import BaseCommand
from core.ml.predictor import train_and_save_model, MODEL_PATH


class Command(BaseCommand):
    help = 'Retrains the scikit-learn expiry risk prediction model and saves it to disk.'

    def handle(self, *args, **options):
        clf = train_and_save_model()
        self.stdout.write(self.style.SUCCESS(f"Successfully retrained scikit-learn RandomForest model with {len(clf.estimators_)} trees."))
        self.stdout.write(self.style.SUCCESS(f"Model saved to {MODEL_PATH}"))
